using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Consultorio.API.Services;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Consultorio.API.Controllers;

[ApiController]
[AllowAnonymous]
[EnableCors("AllowWebhooks")]
[Route("api/webhooks/instagram")]
public class InstagramWebhookController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<InstagramWebhookController> _logger;

    public InstagramWebhookController(AppDbContext db, ILogger<InstagramWebhookController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ─── GET: Meta webhook verification challenge ─────────────────────────────
    [HttpGet]
    public async Task<IActionResult> Verify(
        [FromQuery(Name = "hub.mode")]         string? mode,
        [FromQuery(Name = "hub.verify_token")] string? verifyToken,
        [FromQuery(Name = "hub.challenge")]    string? challenge)
    {
        if (!string.Equals(mode, "subscribe", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(verifyToken) ||
            string.IsNullOrWhiteSpace(challenge))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        // Aceita IgVerifyToken dedicado ou, para compatibilidade, WaVerifyToken da clínica.
        var token = InstagramService.SanitizeToken(verifyToken);
        var exists = await _db.Clinics.AnyAsync(c =>
            c.IsActive &&
            ((c.IgVerifyToken != null && c.IgVerifyToken == token) ||
             (c.WaVerifyToken != null && c.WaVerifyToken == token)));

        return exists ? Content(challenge, "text/plain", Encoding.UTF8) : StatusCode(StatusCodes.Status403Forbidden);
    }

    // ─── POST: Receive messages and status updates from Meta ──────────────────
    [HttpPost]
    public async Task<IActionResult> Receive()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var rawBody = await reader.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(rawBody))
            return Ok();

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;

        var recipientIds = ExtractRecipientIdentifiers(root);
        if (recipientIds.Count == 0)
            return Ok();

        var clinic = await _db.Clinics.FirstOrDefaultAsync(c =>
            c.IsActive &&
            ((c.IgPageId != null && recipientIds.Contains(c.IgPageId)) ||
             (c.IgAccountId != null && recipientIds.Contains(c.IgAccountId))));

        if (clinic == null)
        {
            _logger.LogWarning(
                "Instagram webhook ignored: nenhum identificador configurado corresponde ao payload. Candidates: {RecipientIds}",
                string.Join(", ", recipientIds));
            return Ok();
        }

        // Usa IgAppSecret dedicado; se não configurado, tenta WaAppSecret (mesmo app Meta).
        var appSecret = !string.IsNullOrWhiteSpace(clinic.IgAppSecret)
            ? clinic.IgAppSecret
            : clinic.WaAppSecret;

        if (string.IsNullOrWhiteSpace(appSecret))
        {
            _logger.LogWarning(
                "Instagram webhook rejected for clinic {ClinicId}: App Secret não configurado (IgAppSecret ou WaAppSecret).",
                clinic.Id);
            return Unauthorized();
        }

        if (!ValidateSignature(rawBody, appSecret, Request.Headers["X-Hub-Signature-256"].FirstOrDefault()))
        {
            _logger.LogWarning("Instagram webhook rejected: invalid signature for clinic {ClinicId}.", clinic.Id);
            return Unauthorized();
        }

        await ProcessMessagesAsync(root, clinic);

        return Ok();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static List<string> ExtractRecipientIdentifiers(JsonElement root)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);

        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return ids.ToList();

        foreach (var entry in entries.EnumerateArray())
        {
            if (entry.TryGetProperty("id", out var idEl))
                AddRecipientIdentifier(ids, idEl.GetString());

            if (!entry.TryGetProperty("messaging", out var messaging) || messaging.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var event_ in messaging.EnumerateArray())
            {
                if (event_.TryGetProperty("recipient", out var recipientEl) &&
                    recipientEl.TryGetProperty("id", out var recipientIdEl))
                {
                    AddRecipientIdentifier(ids, recipientIdEl.GetString());
                }
            }
        }

        return ids.ToList();
    }

    private static void AddRecipientIdentifier(ISet<string> ids, string? candidate)
    {
        if (!string.IsNullOrWhiteSpace(candidate))
            ids.Add(candidate);
    }

    private static bool ValidateSignature(string rawBody, string? appSecret, string? signatureHeader)
    {
        var secret = InstagramService.SanitizeToken(appSecret);
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(signatureHeader))
            return false;

        const string prefix = "sha256=";
        if (!signatureHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return false;

        var received = signatureHeader[prefix.Length..];
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody));
        var expected = Convert.ToHexString(hash).ToLowerInvariant();

        var receivedBytes = Encoding.UTF8.GetBytes(received.ToLowerInvariant());
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return receivedBytes.Length == expectedBytes.Length &&
               CryptographicOperations.FixedTimeEquals(receivedBytes, expectedBytes);
    }

    private async Task ProcessMessagesAsync(JsonElement root, Clinic clinic)
    {
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return;

        foreach (var entry in entries.EnumerateArray())
        {
            if (!entry.TryGetProperty("messaging", out var messaging) || messaging.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var event_ in messaging.EnumerateArray())
            {
                if (!event_.TryGetProperty("message", out var messageEl))
                    continue;

                if (messageEl.TryGetProperty("is_echo", out var isEchoEl) &&
                    isEchoEl.ValueKind == JsonValueKind.True)
                    continue;

                var messageId = messageEl.TryGetProperty("mid", out var midEl) ? midEl.GetString() : null;
                if (string.IsNullOrWhiteSpace(messageId))
                    continue;

                var alreadyImported = await _db.PatientMessages.AnyAsync(m =>
                    m.ClinicId == clinic.Id &&
                    m.ExternalMessageId == messageId);
                if (alreadyImported)
                    continue;

                var senderId = event_.TryGetProperty("sender", out var senderEl) &&
                               senderEl.TryGetProperty("id", out var senderIdEl)
                    ? senderIdEl.GetString() : null;
                if (string.IsNullOrWhiteSpace(senderId))
                    continue;

                var content = ExtractMessageContent(messageEl);
                if (string.IsNullOrWhiteSpace(content))
                    content = "[Mensagem Instagram não textual]";

                var patient = await FindOrCreatePatientByIgSenderAsync(clinic, senderId);

                _db.PatientMessages.Add(new PatientMessage
                {
                    Id                = Guid.NewGuid(),
                    PatientId         = patient.Id,
                    ClinicId          = clinic.Id,
                    Content           = content,
                    Direction         = "IN",
                    Source            = "INSTAGRAM",
                    IsRead            = false,
                    ExternalMessageId = messageId,
                    ExternalStatus    = "received",
                    ExternalProvider  = "INSTAGRAM",
                    CreatedAt         = DateTime.UtcNow,
                });
            }
        }

        await _db.SaveChangesAsync();
    }

    private async Task<Patient> FindOrCreatePatientByIgSenderAsync(Clinic clinic, string igSenderId)
    {
        var existing = await _db.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.ClinicId == clinic.Id && p.IsActive && p.IgUserId == igSenderId);
        if (existing != null) return existing;

        // Tenta buscar o nome do remetente via Graph API
        string? igName = null;
        if (!string.IsNullOrWhiteSpace(clinic.IgAccessToken))
            igName = await FetchInstagramUserNameAsync(igSenderId, clinic.IgAccessToken);
        var displayName = igName ?? $"Instagram {igSenderId[..Math.Min(8, igSenderId.Length)]}";

        var placeholderEmail = $"ig.{igSenderId}@instagram.local";
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == placeholderEmail);
        if (user == null)
        {
            user = new User
            {
                Id           = Guid.NewGuid(),
                Name         = displayName,
                Email        = placeholderEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
                IsActive     = true,
                CreatedAt    = DateTime.UtcNow,
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        var patient = new Patient
        {
            Id        = Guid.NewGuid(),
            ClinicId  = clinic.Id,
            UserId    = user.Id,
            IgUserId  = igSenderId,
            Notes     = "Criado automaticamente via Instagram Direct. Vincule a um paciente existente se necessário.",
            IsActive  = true,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Patients.Add(patient);
        await _db.SaveChangesAsync();

        patient.User = user;
        _logger.LogInformation("Instagram: novo paciente criado automaticamente para sender {SenderId} na clínica {ClinicId}.", igSenderId, clinic.Id);
        return patient;
    }

    private static async Task<string?> FetchInstagramUserNameAsync(string igSenderId, string igAccessToken)
    {
        try
        {
            using var http = new HttpClient();
            var url = $"https://graph.facebook.com/v19.0/{igSenderId}?fields=name&access_token={igAccessToken}";
            var resp = await http.GetAsync(url);
            if (!resp.IsSuccessStatusCode) return null;
            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
        }
        catch { return null; }
    }

    private static string? ExtractMessageContent(JsonElement message)
    {
        if (message.TryGetProperty("text", out var text))
            return text.GetString();

        if (message.TryGetProperty("attachments", out var attachments) &&
            attachments.ValueKind == JsonValueKind.Array &&
            attachments.GetArrayLength() > 0)
        {
            var first = attachments[0];
            var type = first.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : "arquivo";
            return $"[Anexo Instagram: {type}]";
        }

        return null;
    }
}
