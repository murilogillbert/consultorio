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
[Route("api/webhooks/whatsapp")]
public class WhatsAppWebhookController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<WhatsAppWebhookController> _logger;

    public WhatsAppWebhookController(AppDbContext db, ILogger<WhatsAppWebhookController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Verify(
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")] string? verifyToken,
        [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        if (!string.Equals(mode, "subscribe", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(verifyToken) ||
            string.IsNullOrWhiteSpace(challenge))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        var token = WhatsAppCloudService.SanitizeSecret(verifyToken);
        var exists = await _db.Clinics.AnyAsync(c =>
            c.IsActive &&
            c.WaVerifyToken != null &&
            c.WaVerifyToken == token);

        return exists ? Content(challenge, "text/plain", Encoding.UTF8) : StatusCode(StatusCodes.Status403Forbidden);
    }

    [HttpPost]
    public async Task<IActionResult> Receive()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var rawBody = await reader.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(rawBody))
            return Ok();

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;
        var phoneNumberId = ExtractPhoneNumberId(root);
        if (string.IsNullOrWhiteSpace(phoneNumberId))
            return Ok();

        var clinic = await _db.Clinics.FirstOrDefaultAsync(c =>
            c.IsActive &&
            c.WaPhoneNumberId == phoneNumberId);

        if (clinic == null)
        {
            _logger.LogWarning("WhatsApp webhook ignored: phone number id {PhoneNumberId} is not configured.", phoneNumberId);
            return Ok();
        }

        if (!ValidateSignature(rawBody, clinic.WaAppSecret, Request.Headers["X-Hub-Signature-256"].FirstOrDefault()))
        {
            _logger.LogWarning("WhatsApp webhook rejected: invalid signature for clinic {ClinicId}.", clinic.Id);
            return Unauthorized();
        }

        await ProcessStatusesAsync(root, clinic.Id);
        await ProcessMessagesAsync(root, clinic.Id);

        return Ok();
    }

    private static string? ExtractPhoneNumberId(JsonElement root)
    {
        foreach (var value in EnumerateValues(root))
        {
            if (value.TryGetProperty("metadata", out var metadata) &&
                metadata.TryGetProperty("phone_number_id", out var idEl))
            {
                return idEl.GetString();
            }
        }

        return null;
    }

    private static IEnumerable<JsonElement> EnumerateValues(JsonElement root)
    {
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            yield break;

        foreach (var entry in entries.EnumerateArray())
        {
            if (!entry.TryGetProperty("changes", out var changes) || changes.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var change in changes.EnumerateArray())
            {
                if (change.TryGetProperty("value", out var value))
                    yield return value;
            }
        }
    }

    private static bool ValidateSignature(string rawBody, string? appSecret, string? signatureHeader)
    {
        var secret = WhatsAppCloudService.SanitizeSecret(appSecret);
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

    private async Task ProcessStatusesAsync(JsonElement root, Guid clinicId)
    {
        foreach (var value in EnumerateValues(root))
        {
            if (!value.TryGetProperty("statuses", out var statuses) || statuses.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var status in statuses.EnumerateArray())
            {
                var messageId = status.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
                if (string.IsNullOrWhiteSpace(messageId))
                    continue;

                var existing = await _db.PatientMessages
                    .Where(m => m.ClinicId == clinicId && m.ExternalMessageId == messageId)
                    .OrderByDescending(m => m.CreatedAt)
                    .FirstOrDefaultAsync();

                if (existing == null)
                    continue;

                existing.ExternalStatus = status.TryGetProperty("status", out var statusEl)
                    ? statusEl.GetString()
                    : existing.ExternalStatus;
                existing.ExternalTimestamp = WhatsAppCloudService.FromUnixTimestamp(
                    status.TryGetProperty("timestamp", out var timestampEl) ? timestampEl.GetString() : null);
            }
        }

        await _db.SaveChangesAsync();
    }

    private async Task ProcessMessagesAsync(JsonElement root, Guid clinicId)
    {
        foreach (var value in EnumerateValues(root))
        {
            if (!value.TryGetProperty("messages", out var messages) || messages.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var message in messages.EnumerateArray())
            {
                var messageId = message.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
                if (string.IsNullOrWhiteSpace(messageId))
                    continue;

                var alreadyImported = await _db.PatientMessages.AnyAsync(m =>
                    m.ClinicId == clinicId &&
                    m.ExternalMessageId == messageId);
                if (alreadyImported)
                    continue;

                var from = message.TryGetProperty("from", out var fromEl) ? fromEl.GetString() : null;
                var normalizedFrom = WhatsAppCloudService.NormalizePhone(from);
                if (string.IsNullOrWhiteSpace(normalizedFrom))
                    continue;

                var content = ExtractMessageContent(message);
                if (string.IsNullOrWhiteSpace(content))
                    content = "[Mensagem WhatsApp não textual]";

                var patient = await FindPatientByPhoneAsync(clinicId, normalizedFrom);
                if (patient == null)
                {
                    _logger.LogInformation("WhatsApp message {MessageId} from {Phone} has no matching patient in clinic {ClinicId}.", messageId, normalizedFrom, clinicId);
                    continue;
                }

                _db.PatientMessages.Add(new PatientMessage
                {
                    Id = Guid.NewGuid(),
                    PatientId = patient.Id,
                    ClinicId = clinicId,
                    Content = content,
                    Direction = "IN",
                    Source = "WHATSAPP",
                    IsRead = false,
                    ExternalMessageId = messageId,
                    ExternalStatus = "received",
                    ExternalProvider = "WHATSAPP",
                    ExternalTimestamp = WhatsAppCloudService.FromUnixTimestamp(
                        message.TryGetProperty("timestamp", out var timestampEl) ? timestampEl.GetString() : null),
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        await _db.SaveChangesAsync();
    }

    private async Task<Patient?> FindPatientByPhoneAsync(Guid clinicId, string normalizedPhone)
    {
        var patients = await _db.Patients
            .Where(p => p.ClinicId == clinicId && p.IsActive && p.Phone != null)
            .ToListAsync();

        return patients.FirstOrDefault(p => WhatsAppCloudService.NormalizePhone(p.Phone) == normalizedPhone);
    }

    private static string? ExtractMessageContent(JsonElement message)
    {
        if (message.TryGetProperty("text", out var text) &&
            text.TryGetProperty("body", out var body))
        {
            return body.GetString();
        }

        if (message.TryGetProperty("button", out var button) &&
            button.TryGetProperty("text", out var buttonText))
        {
            return buttonText.GetString();
        }

        if (message.TryGetProperty("interactive", out var interactive))
        {
            if (interactive.TryGetProperty("button_reply", out var buttonReply) &&
                buttonReply.TryGetProperty("title", out var buttonTitle))
            {
                return buttonTitle.GetString();
            }

            if (interactive.TryGetProperty("list_reply", out var listReply) &&
                listReply.TryGetProperty("title", out var listTitle))
            {
                return listTitle.GetString();
            }
        }

        if (message.TryGetProperty("type", out var typeEl))
            return $"[Mensagem WhatsApp: {typeEl.GetString()}]";

        return null;
    }
}
