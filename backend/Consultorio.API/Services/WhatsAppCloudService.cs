using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;
using Microsoft.EntityFrameworkCore;

namespace Consultorio.API.Services;

public class WhatsAppAccountInfo
{
    public string PhoneNumberId { get; init; } = "";
    public string DisplayPhoneNumber { get; init; } = "";
    public string VerifiedName { get; init; } = "";
}

public class WhatsAppSendResult
{
    public string MessageId { get; init; } = "";
    public string Status { get; init; } = "";
}

public class WhatsAppCloudException : Exception
{
    public int StatusCode { get; }

    public WhatsAppCloudException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}

public class WhatsAppCloudService
{
    private readonly AppDbContext _db;
    private readonly HttpClient _http;
    private readonly string _graphVersion;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    public WhatsAppCloudService(AppDbContext db, IConfiguration config, HttpClient http)
    {
        _db = db;
        _http = http;
        _http.BaseAddress = new Uri(config["WhatsApp:GraphBaseUrl"] ?? "https://graph.facebook.com");
        _graphVersion = config["WhatsApp:GraphVersion"] ?? "v23.0";
    }

    public static string? SanitizeSecret(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var clean = new string(raw.TrimStart('\uFEFF').Trim()
            .Where(c => c >= 0x20 && c <= 0x7E)
            .ToArray());
        return clean == "" ? null : clean;
    }

    public static string NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "";

        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("00", StringComparison.Ordinal) && digits.Length > 2)
            digits = digits[2..];

        if (digits.StartsWith("55", StringComparison.Ordinal))
            return digits;

        if (digits.Length is 10 or 11)
            return "55" + digits;

        return digits;
    }

    private static void EnsureConfigured(Clinic clinic)
    {
        if (string.IsNullOrWhiteSpace(clinic.WaPhoneNumberId))
            throw new WhatsAppCloudException(422, "Phone Number ID do WhatsApp não configurado.");
        if (string.IsNullOrWhiteSpace(clinic.WaAccessToken))
            throw new WhatsAppCloudException(422, "Access Token do WhatsApp não configurado.");
    }

    private HttpRequestMessage CreateAuthorizedRequest(HttpMethod method, string url, Clinic clinic)
    {
        EnsureConfigured(clinic);
        var req = new HttpRequestMessage(method, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", SanitizeSecret(clinic.WaAccessToken));
        return req;
    }

    public async Task<WhatsAppAccountInfo> TestConnectionAsync(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId);
        if (clinic == null)
            throw new WhatsAppCloudException(404, "Clínica não encontrada.");

        var fields = Uri.EscapeDataString("display_phone_number,verified_name");
        var req = CreateAuthorizedRequest(
            HttpMethod.Get,
            $"/{_graphVersion}/{clinic.WaPhoneNumberId}?fields={fields}",
            clinic);

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new WhatsAppCloudException((int)res.StatusCode, $"WhatsApp test error {res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        return new WhatsAppAccountInfo
        {
            PhoneNumberId = clinic.WaPhoneNumberId ?? "",
            DisplayPhoneNumber = root.TryGetProperty("display_phone_number", out var phoneEl) ? phoneEl.GetString() ?? "" : "",
            VerifiedName = root.TryGetProperty("verified_name", out var nameEl) ? nameEl.GetString() ?? "" : "",
        };
    }

    public async Task<WhatsAppSendResult> SendTextMessageAsync(Guid clinicId, string toPhone, string message)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId);
        if (clinic == null)
            throw new WhatsAppCloudException(404, "Clínica não encontrada.");

        var normalizedPhone = NormalizePhone(toPhone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            throw new WhatsAppCloudException(422, "Telefone do paciente inválido para WhatsApp.");

        if (string.IsNullOrWhiteSpace(message))
            throw new WhatsAppCloudException(422, "Mensagem não pode estar vazia.");

        var body = new
        {
            messaging_product = "whatsapp",
            recipient_type = "individual",
            to = normalizedPhone,
            type = "text",
            text = new
            {
                preview_url = false,
                body = message.Trim()
            }
        };

        var req = CreateAuthorizedRequest(HttpMethod.Post, $"/{_graphVersion}/{clinic.WaPhoneNumberId}/messages", clinic);
        req.Content = new StringContent(JsonSerializer.Serialize(body, JsonOptions), Encoding.UTF8, "application/json");

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new WhatsAppCloudException((int)res.StatusCode, $"WhatsApp send error {res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        var messageId = "";
        if (root.TryGetProperty("messages", out var messagesEl) &&
            messagesEl.ValueKind == JsonValueKind.Array &&
            messagesEl.GetArrayLength() > 0 &&
            messagesEl[0].TryGetProperty("id", out var idEl))
        {
            messageId = idEl.GetString() ?? "";
        }

        var status = "";
        if (root.TryGetProperty("messages", out var statusMessagesEl) &&
            statusMessagesEl.ValueKind == JsonValueKind.Array &&
            statusMessagesEl.GetArrayLength() > 0 &&
            statusMessagesEl[0].TryGetProperty("message_status", out var statusEl))
        {
            status = statusEl.GetString() ?? "";
        }

        return new WhatsAppSendResult { MessageId = messageId, Status = status };
    }

    public static DateTime? FromUnixTimestamp(string? value)
    {
        if (!long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var unix))
            return null;

        try { return DateTimeOffset.FromUnixTimeSeconds(unix).UtcDateTime; }
        catch { return null; }
    }
}
