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

        // Instagram DM webhooks identify the recipient by the page ID
        var pageId = ExtractPageId(root);
        if (string.IsNullOrWhiteSpace(pageId))
            return Ok();

        var clinic = await _db.Clinics.FirstOrDefaultAsync(c =>
            c.IsActive &&
            c.IgPageId == pageId);

        if (clinic == null)
        {
            _logger.LogWarning("Instagram webhook ignored: page id {PageId} is not configured.", pageId);
            return Ok();
        }

        // Instagram reuses the WhatsApp App Secret when both products live under the
        // same Meta App (the common case). If the admin configured only Instagram
        // without WhatsApp, surface that as the first diagnostic hint.
        if (string.IsNullOrWhiteSpace(clinic.WaAppSecret))
        {
            _logger.LogWarning(
                "Instagram webhook rejected for clinic {ClinicId}: App Secret is not configured. " +
                "Instagram shares the WhatsApp App Secret field in the current integration layout.",
                clinic.Id);
            return Unauthorized();
        }

        if (!ValidateSignature(rawBody, clinic.WaAppSecret, Request.Headers["X-Hub-Signature-256"].FirstOrDefault()))
        {
            _logger.LogWarning("Instagram webhook rejected: invalid signature for clinic {ClinicId}.", clinic.Id);
            return Unauthorized();
        }

        await ProcessMessagesAsync(root, clinic.Id);

        return Ok();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static string? ExtractPageId(JsonElement root)
    {
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return null;

        foreach (var entry in entries.EnumerateArray())
        {
            if (entry.TryGetProperty("id", out var idEl))
                return idEl.GetString();
        }

        return null;
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

    private async Task ProcessMessagesAsync(JsonElement root, Guid clinicId)
    {
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return;

        foreach (var entry in entries.EnumerateArray())
        {
            if (!entry.TryGetProperty("messaging", out var messaging) || messaging.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var event_ in messaging.EnumerateArray())
            {
                // Only process actual messages (skip read receipts, delivery, etc.)
                if (!event_.TryGetProperty("message", out var messageEl))
                    continue;

                var messageId = messageEl.TryGetProperty("mid", out var midEl) ? midEl.GetString() : null;
                if (string.IsNullOrWhiteSpace(messageId))
                    continue;

                // Skip if already imported (idempotency)
                var alreadyImported = await _db.PatientMessages.AnyAsync(m =>
                    m.ClinicId == clinicId &&
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

                var patient = await FindPatientByIgSenderAsync(clinicId, senderId);
                if (patient == null)
                {
                    _logger.LogInformation(
                        "Instagram message {MessageId} from sender {SenderId} has no matching patient in clinic {ClinicId}.",
                        messageId, senderId, clinicId);
                    continue;
                }

                _db.PatientMessages.Add(new PatientMessage
                {
                    Id                = Guid.NewGuid(),
                    PatientId         = patient.Id,
                    ClinicId          = clinicId,
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

    private async Task<Patient?> FindPatientByIgSenderAsync(Guid clinicId, string igSenderId)
    {
        // Match by IgUserId stored on the patient (added separately when a patient
        // first contacts via Instagram or is manually linked in the UI).
        return await _db.Patients.FirstOrDefaultAsync(p =>
            p.ClinicId == clinicId &&
            p.IsActive &&
            p.IgUserId == igSenderId);
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
