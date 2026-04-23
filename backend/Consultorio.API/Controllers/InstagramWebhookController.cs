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
        _logger.LogInformation(
            "[IG-WEBHOOK] GET Verify chamado. mode={Mode} verifyToken={VerifyToken} challenge={Challenge}",
            mode ?? "(null)",
            string.IsNullOrWhiteSpace(verifyToken) ? "(null)" : (verifyToken.Length > 4 ? verifyToken[..4] + "***" : "***"),
            string.IsNullOrWhiteSpace(challenge) ? "(null)" : (challenge.Length > 8 ? challenge[..8] + "..." : challenge));

        if (!string.Equals(mode, "subscribe", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(verifyToken) ||
            string.IsNullOrWhiteSpace(challenge))
        {
            _logger.LogWarning("[IG-WEBHOOK] GET Verify rejeitado: parâmetros hub.* ausentes/inválidos.");
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        // Aceita IgVerifyToken dedicado ou, para compatibilidade, WaVerifyToken da clínica.
        var token = InstagramService.SanitizeToken(verifyToken);
        var match = await _db.Clinics
            .Where(c => c.IsActive &&
                ((c.IgVerifyToken != null && c.IgVerifyToken == token) ||
                 (c.WaVerifyToken != null && c.WaVerifyToken == token)))
            .Select(c => new { c.Id, UsedIg = c.IgVerifyToken == token })
            .FirstOrDefaultAsync();

        if (match == null)
        {
            _logger.LogWarning("[IG-WEBHOOK] GET Verify rejeitado: verify_token não confere com nenhuma clínica ativa.");
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        _logger.LogInformation("[IG-WEBHOOK] GET Verify OK — clínica {ClinicId} (source={Source}).",
            match.Id, match.UsedIg ? "IgVerifyToken" : "WaVerifyToken");
        return Content(challenge, "text/plain", Encoding.UTF8);
    }

    // ─── POST: Receive messages and status updates from Meta ──────────────────
    // IMPORTANTE: SEMPRE retornamos 200 OK, mesmo em rejeição. A Meta fica
    // retentando (com backoff) qualquer resposta não-200 e pode desativar
    // o webhook após várias falhas. Rejeições são logadas e o retorno é 200.
    [HttpPost]
    public async Task<IActionResult> Receive()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var rawBody = await reader.ReadToEndAsync();

        // Log inicial: sabemos que o webhook foi *chamado*. Útil pra confirmar
        // que a Meta está mandando algo (vs "nem chega").
        var signatureHeader = Request.Headers["X-Hub-Signature-256"].FirstOrDefault();
        var contentType     = Request.Headers["Content-Type"].FirstOrDefault();
        var userAgent       = Request.Headers["User-Agent"].FirstOrDefault();
        var bodyPreview     = string.IsNullOrEmpty(rawBody)
            ? "(empty)"
            : rawBody.Length > 2000 ? rawBody[..2000] + "...[truncated]" : rawBody;

        _logger.LogInformation(
            "[IG-WEBHOOK] POST received. Body size: {Size}. Content-Type: {ContentType}. User-Agent: {UserAgent}. Signature header: {Signature}. Body preview: {Body}",
            rawBody?.Length ?? 0,
            contentType ?? "(none)",
            userAgent ?? "(none)",
            string.IsNullOrWhiteSpace(signatureHeader) ? "(missing)" : signatureHeader.Length > 40 ? signatureHeader[..40] + "..." : signatureHeader,
            bodyPreview);

        if (string.IsNullOrWhiteSpace(rawBody))
        {
            _logger.LogWarning("[IG-WEBHOOK] Body vazio — retornando 200 OK (Meta test ping?).");
            return Ok();
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(rawBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[IG-WEBHOOK] JSON inválido no corpo do webhook. Body: {Body}", bodyPreview);
            return Ok(); // 200 para não causar retry
        }

        using (doc)
        {
            var root = doc.RootElement;

            var recipientIds = ExtractRecipientIdentifiers(root);
            _logger.LogInformation(
                "[IG-WEBHOOK] Object: {Object}. Entry count: {EntryCount}. Recipient candidates: {RecipientIds}",
                root.TryGetProperty("object", out var objectEl) ? objectEl.GetString() : "(missing)",
                root.TryGetProperty("entry", out var entryArr) && entryArr.ValueKind == JsonValueKind.Array ? entryArr.GetArrayLength() : 0,
                recipientIds.Count == 0 ? "(none)" : string.Join(", ", recipientIds));

            if (recipientIds.Count == 0)
            {
                _logger.LogWarning("[IG-WEBHOOK] Payload sem recipient ids identificáveis. Retornando 200 OK.");
                return Ok();
            }

            var clinic = await _db.Clinics.FirstOrDefaultAsync(c =>
                c.IsActive &&
                ((c.IgPageId != null && recipientIds.Contains(c.IgPageId)) ||
                 (c.IgAccountId != null && recipientIds.Contains(c.IgAccountId))));

            if (clinic == null)
            {
                // Dump todas as clínicas ativas com Ig configurado pra facilitar o match manual
                var configured = await _db.Clinics
                    .Where(c => c.IsActive && (c.IgPageId != null || c.IgAccountId != null))
                    .Select(c => new { c.Id, c.IgPageId, c.IgAccountId })
                    .ToListAsync();

                _logger.LogWarning(
                    "[IG-WEBHOOK] Nenhuma clínica corresponde ao payload. Payload IDs: [{RecipientIds}]. Clínicas configuradas: [{Configured}]. Retornando 200 OK.",
                    string.Join(", ", recipientIds),
                    string.Join(" | ", configured.Select(c => $"clinicId={c.Id} pageId={c.IgPageId ?? "(null)"} accountId={c.IgAccountId ?? "(null)"}")));
                return Ok();
            }

            _logger.LogInformation("[IG-WEBHOOK] Match com clínica {ClinicId} (IgPageId={IgPageId}, IgAccountId={IgAccountId}).",
                clinic.Id, clinic.IgPageId, clinic.IgAccountId);

            // Usa IgAppSecret dedicado; se não configurado, tenta WaAppSecret (mesmo app Meta).
            var appSecret = !string.IsNullOrWhiteSpace(clinic.IgAppSecret)
                ? clinic.IgAppSecret
                : clinic.WaAppSecret;

            var usedWaFallback = string.IsNullOrWhiteSpace(clinic.IgAppSecret) && !string.IsNullOrWhiteSpace(clinic.WaAppSecret);

            if (string.IsNullOrWhiteSpace(appSecret))
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] Clínica {ClinicId} sem App Secret configurado (IgAppSecret=null e WaAppSecret=null). NÃO valida assinatura. Retornando 200 OK.",
                    clinic.Id);
                return Ok();
            }

            if (usedWaFallback)
                _logger.LogInformation("[IG-WEBHOOK] Clínica {ClinicId} usando WaAppSecret como fallback (IgAppSecret não configurado).", clinic.Id);

            var (sigValid, sigDetail) = ValidateSignatureDetailed(rawBody, appSecret, signatureHeader);
            if (!sigValid)
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] Assinatura inválida para clínica {ClinicId}. Motivo: {Reason}. AppSecret source: {Source}. Retornando 200 OK (para não gerar retry da Meta).",
                    clinic.Id, sigDetail, usedWaFallback ? "WaAppSecret (fallback)" : "IgAppSecret");
                return Ok();
            }

            _logger.LogInformation("[IG-WEBHOOK] Assinatura OK para clínica {ClinicId}. Processando mensagens...", clinic.Id);

            try
            {
                await ProcessMessagesAsync(root, clinic);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[IG-WEBHOOK] Erro ao processar mensagens para clínica {ClinicId}.", clinic.Id);
            }

            return Ok();
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static List<string> ExtractRecipientIdentifiers(JsonElement root)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);

        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return ids.ToList();

        foreach (var entry in entries.EnumerateArray())
        {
            // entry.id é o Page ID (object=page) ou o IG Business Account ID (object=instagram)
            if (entry.TryGetProperty("id", out var idEl))
                AddRecipientIdentifier(ids, idEl.GetString());

            // Formato A: Messenger Platform → entry[].messaging[].recipient.id
            if (entry.TryGetProperty("messaging", out var messaging) && messaging.ValueKind == JsonValueKind.Array)
            {
                foreach (var event_ in messaging.EnumerateArray())
                {
                    if (event_.TryGetProperty("recipient", out var recipientEl) &&
                        recipientEl.TryGetProperty("id", out var recipientIdEl))
                        AddRecipientIdentifier(ids, recipientIdEl.GetString());
                }
            }

            // Formato B: Instagram Graph API → entry[].changes[].value.recipient.id
            if (entry.TryGetProperty("changes", out var changes) && changes.ValueKind == JsonValueKind.Array)
            {
                foreach (var change in changes.EnumerateArray())
                {
                    if (change.TryGetProperty("value", out var value) &&
                        value.TryGetProperty("recipient", out var recipientEl) &&
                        recipientEl.TryGetProperty("id", out var recipientIdEl))
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

    private static (bool ok, string detail) ValidateSignatureDetailed(string rawBody, string? appSecret, string? signatureHeader)
    {
        var secret = InstagramService.SanitizeToken(appSecret);
        if (string.IsNullOrWhiteSpace(secret))
            return (false, "App Secret vazio após sanitização.");
        if (string.IsNullOrWhiteSpace(signatureHeader))
            return (false, "Header X-Hub-Signature-256 ausente.");

        const string prefix = "sha256=";
        if (!signatureHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return (false, $"Header não começa com 'sha256='. Valor recebido (trunc): {(signatureHeader.Length > 32 ? signatureHeader[..32] + "..." : signatureHeader)}");

        var received = signatureHeader[prefix.Length..];
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody));
        var expected = Convert.ToHexString(hash).ToLowerInvariant();

        var receivedBytes = Encoding.UTF8.GetBytes(received.ToLowerInvariant());
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var ok = receivedBytes.Length == expectedBytes.Length &&
                 CryptographicOperations.FixedTimeEquals(receivedBytes, expectedBytes);

        if (ok) return (true, "");
        // Não logamos o secret/HMAC completo por segurança — apenas os primeiros caracteres.
        var recvPrev = received.Length > 12 ? received[..12] + "..." : received;
        var expPrev  = expected.Length > 12 ? expected[..12] + "..." : expected;
        return (false, $"HMAC não bateu. received={recvPrev} expected={expPrev}. Prováveis causas: App Secret errado, body mutilado por proxy, ou Page/App diferentes.");
    }

    private async Task ProcessMessagesAsync(JsonElement root, Clinic clinic)
    {
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return;

        foreach (var entry in entries.EnumerateArray())
        {
            // ── Formato A: Messenger Platform (object=page) ────────────────────
            // entry[].messaging[] → cada elemento é um evento de mensagem diretamente
            if (entry.TryGetProperty("messaging", out var messaging) && messaging.ValueKind == JsonValueKind.Array)
            {
                _logger.LogInformation("[IG-WEBHOOK] Entry usando formato Messenger (messaging[]). Count: {Count}", messaging.GetArrayLength());
                foreach (var event_ in messaging.EnumerateArray())
                    await ProcessSingleMessageEventAsync(event_, clinic);
            }

            // ── Formato B: Instagram Graph API (object=instagram) ──────────────
            // entry[].changes[] → cada change com field=messages tem o evento em .value
            if (entry.TryGetProperty("changes", out var changes) && changes.ValueKind == JsonValueKind.Array)
            {
                _logger.LogInformation("[IG-WEBHOOK] Entry usando formato Instagram Graph API (changes[]). Count: {Count}", changes.GetArrayLength());
                foreach (var change in changes.EnumerateArray())
                {
                    var field = change.TryGetProperty("field", out var fieldEl) ? fieldEl.GetString() : null;
                    if (!string.Equals(field, "messages", StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogInformation("[IG-WEBHOOK] Change ignorado (field={Field}). Só processamos field=messages.", field ?? "(null)");
                        continue;
                    }

                    if (!change.TryGetProperty("value", out var value) || value.ValueKind != JsonValueKind.Object)
                        continue;

                    // value tem a mesma estrutura de um evento de messaging
                    await ProcessSingleMessageEventAsync(value, clinic);
                }
            }
        }

        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Processa um único evento de mensagem — funciona tanto com eventos do formato
    /// Messenger Platform (entry.messaging[i]) quanto do Instagram Graph API
    /// (entry.changes[i].value), pois ambos têm a mesma estrutura interna.
    /// NÃO chama SaveChangesAsync — o caller chama uma única vez no final.
    /// </summary>
    private async Task ProcessSingleMessageEventAsync(JsonElement event_, Clinic clinic)
    {
        if (!event_.TryGetProperty("message", out var messageEl))
            return;

        // Ignorar echos (mensagens enviadas pela própria página/conta)
        if (messageEl.TryGetProperty("is_echo", out var isEchoEl) &&
            isEchoEl.ValueKind == JsonValueKind.True)
        {
            _logger.LogInformation("[IG-WEBHOOK] Mensagem ignorada (is_echo=true).");
            return;
        }

        var messageId = messageEl.TryGetProperty("mid", out var midEl) ? midEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(messageId))
        {
            _logger.LogWarning("[IG-WEBHOOK] Mensagem sem mid — ignorada.");
            return;
        }

        var alreadyImported = await _db.PatientMessages.AnyAsync(m =>
            m.ClinicId == clinic.Id &&
            m.ExternalMessageId == messageId);
        if (alreadyImported)
        {
            _logger.LogInformation("[IG-WEBHOOK] Mensagem {MessageId} já importada — ignorada (duplicata).", messageId);
            return;
        }

        var senderId = event_.TryGetProperty("sender", out var senderEl) &&
                       senderEl.TryGetProperty("id", out var senderIdEl)
            ? senderIdEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(senderId))
        {
            _logger.LogWarning("[IG-WEBHOOK] Mensagem {MessageId} sem sender.id — ignorada.", messageId);
            return;
        }

        var content = ExtractMessageContent(messageEl);
        if (string.IsNullOrWhiteSpace(content))
            content = "[Mensagem Instagram não textual]";

        var externalTimestamp = event_.TryGetProperty("timestamp", out var timestampEl)
            ? ParseMetaTimestamp(timestampEl)
            : null;

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
            ExternalTimestamp = externalTimestamp,
            CreatedAt         = externalTimestamp ?? DateTime.UtcNow,
        });

        _logger.LogInformation(
            "[IG-WEBHOOK] Mensagem {MessageId} processada para clínica {ClinicId}. Sender: {SenderId}. PatientId: {PatientId}. Conteúdo: {Preview}",
            messageId, clinic.Id, senderId, patient.Id,
            content.Length > 80 ? content[..80] + "..." : content);
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
            var url = first.TryGetProperty("payload", out var payloadEl) &&
                      payloadEl.TryGetProperty("url", out var urlEl)
                ? urlEl.GetString()
                : null;
            return string.IsNullOrWhiteSpace(url)
                ? $"[Anexo Instagram: {type}]"
                : $"[Anexo Instagram: {type}] {url}";
        }

        return null;
    }

    private static DateTime? ParseMetaTimestamp(JsonElement timestamp)
    {
        long value;
        if (timestamp.ValueKind == JsonValueKind.Number)
        {
            if (!timestamp.TryGetInt64(out value)) return null;
        }
        else if (timestamp.ValueKind == JsonValueKind.String)
        {
            if (!long.TryParse(timestamp.GetString(), out value)) return null;
        }
        else
        {
            return null;
        }

        try
        {
            return value > 9_999_999_999
                ? DateTimeOffset.FromUnixTimeMilliseconds(value).UtcDateTime
                : DateTimeOffset.FromUnixTimeSeconds(value).UtcDateTime;
        }
        catch
        {
            return null;
        }
    }
}
