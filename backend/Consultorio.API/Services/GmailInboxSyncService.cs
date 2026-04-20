using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Services;

public class GmailInboxSyncService
{
    private const string GmailBaseUrl = "https://gmail.googleapis.com/gmail/v1/users/me";

    private readonly AppDbContext _db;
    private readonly GoogleOAuthService _googleOAuth;
    private readonly HttpClient _http;
    private readonly ILogger<GmailInboxSyncService> _logger;

    public GmailInboxSyncService(
        AppDbContext db,
        GoogleOAuthService googleOAuth,
        HttpClient http,
        ILogger<GmailInboxSyncService> logger)
    {
        _db = db;
        _googleOAuth = googleOAuth;
        _http = http;
        _logger = logger;
    }

    public async Task<int> SyncRecentInboxAsync(Guid clinicId, int maxResults = 15)
    {
        if (clinicId == Guid.Empty)
            return 0;

        var clinic = await _db.Clinics.FindAsync(clinicId);
        if (clinic == null || !clinic.GmailConnected)
            return 0;

        if (string.IsNullOrWhiteSpace(clinic.GmailAccessToken) &&
            string.IsNullOrWhiteSpace(clinic.GmailRefreshToken))
        {
            return 0;
        }

        string accessToken;
        try
        {
            accessToken = await _googleOAuth.GetValidAccessTokenAsync(clinicId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Nao foi possivel obter um token Gmail valido para a clinica {ClinicId}", clinicId);
            return 0;
        }

        var references = await ListUnreadInboxMessagesAsync(accessToken, maxResults);
        if (references.Count == 0)
            return 0;

        var detailedMessages = new List<GmailMessageResponse>();
        foreach (var reference in references)
        {
            try
            {
                detailedMessages.Add(await GetMessageAsync(accessToken, reference.Id));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao buscar a mensagem Gmail {MessageId} da clinica {ClinicId}", reference.Id, clinicId);
            }
        }

        var imported = 0;
        foreach (var message in detailedMessages.OrderBy(m => ParseInternalDate(m.InternalDate)))
        {
            try
            {
                if (await TryPersistIncomingMessageAsync(clinicId, message))
                    imported++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao importar a mensagem Gmail {MessageId} da clinica {ClinicId}", message.Id, clinicId);
            }
        }

        return imported;
    }

    public async Task SendEmailReplyAsync(Guid clinicId, string recipientEmail, string subject, string body)
    {
        if (clinicId == Guid.Empty)
            throw new GoogleOAuthException("Clinica invalida para envio de e-mail", StatusCodes.Status400BadRequest);

        if (string.IsNullOrWhiteSpace(recipientEmail))
            throw new GoogleOAuthException("O paciente nao possui e-mail cadastrado para resposta", StatusCodes.Status422UnprocessableEntity);

        var accessToken = await _googleOAuth.GetValidAccessTokenAsync(clinicId);

        var mime = string.Join("\r\n", new[]
        {
            $"To: {recipientEmail.Trim()}",
            $"Subject: =?UTF-8?B?{Convert.ToBase64String(Encoding.UTF8.GetBytes(subject.Trim()))}?=",
            "MIME-Version: 1.0",
            "Content-Type: text/plain; charset=UTF-8",
            string.Empty,
            body.Trim(),
        });

        var raw = ToBase64Url(Encoding.UTF8.GetBytes(mime));

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{GmailBaseUrl}/messages/send")
        {
            Content = JsonContent(new { raw }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await _http.SendAsync(request);
        var payload = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new GoogleOAuthException(
                ExtractGoogleError(payload) ?? "Falha ao enviar a resposta por e-mail",
                StatusCodes.Status400BadRequest);
        }
    }

    private async Task<bool> TryPersistIncomingMessageAsync(Guid clinicId, GmailMessageResponse message)
    {
        var payload = message.Payload;
        var fromHeader = GetHeader(payload, "From");
        var fromEmail = ExtractEmailAddress(fromHeader);
        if (string.IsNullOrWhiteSpace(fromEmail))
            return false;

        var sentAt = ParseInternalDate(message.InternalDate);
        var subject = GetHeader(payload, "Subject");
        var body = NormalizeContent(subject, ExtractBody(payload), message.Snippet);
        var patient = await FindOrCreatePatientAsync(clinicId, fromEmail, ExtractDisplayName(fromHeader));
        if (patient == null)
            return false;

        var alreadyImported = await _db.PatientMessages.AnyAsync(pm =>
            pm.ClinicId == clinicId &&
            pm.PatientId == patient.Id &&
            pm.Direction == "IN" &&
            pm.Source == "EMAIL" &&
            pm.CreatedAt == sentAt &&
            pm.Content == body);

        if (alreadyImported)
            return false;

        _db.PatientMessages.Add(new PatientMessage
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            ClinicId = clinicId,
            Content = body,
            Direction = "IN",
            Source = "EMAIL",
            IsRead = false,
            CreatedAt = sentAt,
        });

        await _db.SaveChangesAsync();
        return true;
    }

    private async Task<Patient?> FindOrCreatePatientAsync(Guid clinicId, string email, string? displayName)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var existingPatient = await _db.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.ClinicId == clinicId && p.User.Email.ToLower() == normalizedEmail);

        if (existingPatient != null)
            return existingPatient;

        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (existingUser != null)
        {
            var patientInAnotherClinic = await _db.Patients.FirstOrDefaultAsync(p => p.UserId == existingUser.Id);
            if (patientInAnotherClinic != null && patientInAnotherClinic.ClinicId != clinicId)
            {
                _logger.LogInformation(
                    "Ignorando e-mail de {Email} para a clinica {ClinicId} porque este usuario ja pertence a outra clinica",
                    normalizedEmail, clinicId);
                return null;
            }

            var isStaff = await _db.SystemUsers.AnyAsync(su => su.UserId == existingUser.Id);
            var isProfessional = await _db.Professionals.AnyAsync(p => p.UserId == existingUser.Id);
            if (isStaff || isProfessional)
            {
                _logger.LogInformation(
                    "Ignorando e-mail de {Email} para a clinica {ClinicId} porque a conta pertence a um usuario interno",
                    normalizedEmail, clinicId);
                return null;
            }

            var createdPatient = new Patient
            {
                Id = Guid.NewGuid(),
                ClinicId = clinicId,
                UserId = existingUser.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            _db.Patients.Add(createdPatient);
            await _db.SaveChangesAsync();
            return createdPatient;
        }

        var safeName = string.IsNullOrWhiteSpace(displayName)
            ? normalizedEmail.Split('@')[0]
            : displayName.Trim();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = safeName,
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            UserId = user.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        _db.Patients.Add(patient);
        await _db.SaveChangesAsync();

        return patient;
    }

    private async Task<List<GmailMessageReference>> ListUnreadInboxMessagesAsync(string accessToken, int maxResults)
    {
        var query = $"labelIds=INBOX&q={Uri.EscapeDataString("is:unread")}&maxResults={maxResults}";
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{GmailBaseUrl}/messages?{query}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await _http.SendAsync(request);
        var payload = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new GoogleOAuthException(
                ExtractGoogleError(payload) ?? "Falha ao listar a caixa de entrada do Gmail",
                StatusCodes.Status400BadRequest);
        }

        var result = Deserialize<GmailListResponse>(payload);
        return result?.Messages ?? [];
    }

    private async Task<GmailMessageResponse> GetMessageAsync(string accessToken, string messageId)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{GmailBaseUrl}/messages/{messageId}?format=full");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await _http.SendAsync(request);
        var payload = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new GoogleOAuthException(
                ExtractGoogleError(payload) ?? "Falha ao carregar a mensagem do Gmail",
                StatusCodes.Status400BadRequest);
        }

        return Deserialize<GmailMessageResponse>(payload)
            ?? throw new GoogleOAuthException("Resposta invalida ao carregar a mensagem do Gmail", StatusCodes.Status400BadRequest);
    }

    private static StringContent JsonContent<T>(T value) =>
        new(JsonSerializer.Serialize(value), Encoding.UTF8, "application/json");

    private static string NormalizeContent(string? subject, string? body, string? snippet)
    {
        var content = string.IsNullOrWhiteSpace(body) ? snippet ?? "" : body;
        content = WebUtility.HtmlDecode(content).Trim();
        content = Regex.Replace(content, @"\r\n?", "\n");
        content = Regex.Replace(content, @"\n{3,}", "\n\n");
        content = content.Trim();

        if (string.IsNullOrWhiteSpace(content))
            content = "(sem conteudo)";

        if (string.IsNullOrWhiteSpace(subject))
            return content;

        return $"Assunto: {subject.Trim()}\n\n{content}";
    }

    private static string? ExtractBody(GmailMessagePart? part)
    {
        if (part == null)
            return null;

        var plain = FindPartBody(part, "text/plain");
        if (!string.IsNullOrWhiteSpace(plain))
            return plain;

        var html = FindPartBody(part, "text/html");
        if (string.IsNullOrWhiteSpace(html))
            return null;

        var stripped = Regex.Replace(html, "<[^>]+>", " ");
        return Regex.Replace(stripped, @"\s{2,}", " ").Trim();
    }

    private static string? FindPartBody(GmailMessagePart part, string mimeType)
    {
        if (string.Equals(part.MimeType, mimeType, StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(part.Body?.Data))
        {
            return DecodeBase64Url(part.Body.Data);
        }

        if (part.Parts == null)
            return null;

        foreach (var child in part.Parts)
        {
            var content = FindPartBody(child, mimeType);
            if (!string.IsNullOrWhiteSpace(content))
                return content;
        }

        return null;
    }

    private static string GetHeader(GmailMessagePart? payload, string name)
    {
        if (payload?.Headers == null)
            return string.Empty;

        var header = payload.Headers.FirstOrDefault(h =>
            string.Equals(h.Name, name, StringComparison.OrdinalIgnoreCase));

        return header?.Value ?? string.Empty;
    }

    private static DateTime ParseInternalDate(string? internalDate)
    {
        if (long.TryParse(internalDate, out var milliseconds))
            return DateTimeOffset.FromUnixTimeMilliseconds(milliseconds).UtcDateTime;

        return DateTime.UtcNow;
    }

    private static string ExtractEmailAddress(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return string.Empty;

        var match = Regex.Match(raw, "<([^>]+)>");
        return match.Success ? match.Groups[1].Value.Trim() : raw.Trim();
    }

    private static string? ExtractDisplayName(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        var match = Regex.Match(raw, @"^([^<]+)<");
        return match.Success ? match.Groups[1].Value.Trim().Trim('"') : null;
    }

    private static string DecodeBase64Url(string value)
    {
        var normalized = value.Replace('-', '+').Replace('_', '/');
        var padding = 4 - (normalized.Length % 4);
        if (padding is > 0 and < 4)
            normalized = normalized.PadRight(normalized.Length + padding, '=');

        var bytes = Convert.FromBase64String(normalized);
        return Encoding.UTF8.GetString(bytes);
    }

    private static string ToBase64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');

    private static T? Deserialize<T>(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return default;

        try
        {
            return JsonSerializer.Deserialize<T>(json);
        }
        catch
        {
            return default;
        }
    }

    private static string? ExtractGoogleError(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

            if (root.TryGetProperty("error_description", out var errorDescription) &&
                errorDescription.ValueKind == JsonValueKind.String)
            {
                return errorDescription.GetString();
            }

            if (root.TryGetProperty("error", out var error))
            {
                if (error.ValueKind == JsonValueKind.String)
                    return error.GetString();

                if (error.ValueKind == JsonValueKind.Object &&
                    error.TryGetProperty("message", out var message) &&
                    message.ValueKind == JsonValueKind.String)
                {
                    return message.GetString();
                }
            }
        }
        catch
        {
        }

        return null;
    }

    private sealed class GmailListResponse
    {
        [JsonPropertyName("messages")]
        public List<GmailMessageReference>? Messages { get; set; }
    }

    private sealed class GmailMessageReference
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;
    }

    private sealed class GmailMessageResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("threadId")]
        public string? ThreadId { get; set; }

        [JsonPropertyName("snippet")]
        public string? Snippet { get; set; }

        [JsonPropertyName("internalDate")]
        public string? InternalDate { get; set; }

        [JsonPropertyName("payload")]
        public GmailMessagePart? Payload { get; set; }
    }

    private sealed class GmailMessagePart
    {
        [JsonPropertyName("mimeType")]
        public string? MimeType { get; set; }

        [JsonPropertyName("headers")]
        public List<GmailHeader>? Headers { get; set; }

        [JsonPropertyName("body")]
        public GmailMessageBody? Body { get; set; }

        [JsonPropertyName("parts")]
        public List<GmailMessagePart>? Parts { get; set; }
    }

    private sealed class GmailMessageBody
    {
        [JsonPropertyName("data")]
        public string? Data { get; set; }
    }

    private sealed class GmailHeader
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("value")]
        public string? Value { get; set; }
    }
}
