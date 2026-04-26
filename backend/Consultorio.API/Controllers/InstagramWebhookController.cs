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
    private readonly MetaInstagramMessagingClient _client;
    private readonly bool _enableMidFallback;

    public InstagramWebhookController(
        AppDbContext db,
        ILogger<InstagramWebhookController> logger,
        IConfiguration config,
        MetaInstagramMessagingClient client)
    {
        _db = db;
        _logger = logger;
        _client = client;
        _enableMidFallback = bool.TryParse(config["Instagram:EnableMidFallbackLookup"], out var b) && b;
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
    [HttpPost]
    public async Task<IActionResult> Receive()
    {
        await using var ms = new MemoryStream();
        await Request.Body.CopyToAsync(ms);
        var rawBytes = ms.ToArray();
        var rawBody  = Encoding.UTF8.GetString(rawBytes);

        var signatureHeader = Request.Headers["X-Hub-Signature-256"].FirstOrDefault();
        var contentType     = Request.Headers["Content-Type"].FirstOrDefault();
        var userAgent       = Request.Headers["User-Agent"].FirstOrDefault();
        var bodyPreview     = string.IsNullOrEmpty(rawBody)
            ? "(empty)"
            : rawBody.Length > 2000 ? rawBody[..2000] + "...[truncated]" : rawBody;

        var bodySha = Convert.ToHexString(SHA256.HashData(rawBytes)).ToLowerInvariant();

        _logger.LogInformation(
            "[IG-WEBHOOK] POST received. Bytes={Bytes} Sha={Sha} CT={CT} UA={UA} Sig={Sig}",
            rawBytes.Length,
            bodySha.Length > 16 ? bodySha[..16] : bodySha,
            contentType ?? "(none)",
            userAgent ?? "(none)",
            string.IsNullOrWhiteSpace(signatureHeader) ? "(missing)" : signatureHeader.Length > 40 ? signatureHeader[..40] + "..." : signatureHeader);

        if (rawBytes.Length == 0)
        {
            _logger.LogWarning("[IG-WEBHOOK] Body vazio — retornando 200 OK (Meta test ping?).");
            return Ok();
        }

        JsonDocument doc;
        try { doc = JsonDocument.Parse(rawBody); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[IG-WEBHOOK] JSON inválido. Body: {Body}", bodyPreview);
            return Ok(); // 200 para não causar retry
        }

        using (doc)
        {
            var root = doc.RootElement;
            var rootObject = root.TryGetProperty("object", out var objectEl) ? objectEl.GetString() : null;

            // ── Logs estruturados de DIAGNÓSTICO por evento (sem token) ──────
            LogStructuredDiagnostics(rootObject, root);

            var recipientIds = ExtractRecipientIdentifiers(root);

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
                var configured = await _db.Clinics
                    .Where(c => c.IsActive && (c.IgPageId != null || c.IgAccountId != null))
                    .Select(c => new { c.Id, c.IgPageId, c.IgAccountId })
                    .ToListAsync();

                _logger.LogWarning(
                    "[IG-WEBHOOK] Nenhuma clínica corresponde ao payload. IDs: [{Ids}]. Configuradas: [{Cfg}].",
                    string.Join(", ", recipientIds),
                    string.Join(" | ", configured.Select(c => $"clinic={c.Id} pageId={c.IgPageId ?? "(null)"} igId={c.IgAccountId ?? "(null)"}")));

                await ProbeSignatureAgainstAllSecretsAsync(rawBytes, signatureHeader, "payload-sem-clinica");
                return Ok();
            }

            _logger.LogInformation("[IG-WEBHOOK] Match clínica {Clinic} (page={Page} igAccount={Ig}).",
                clinic.Id, clinic.IgPageId, clinic.IgAccountId);

            var appSecret = !string.IsNullOrWhiteSpace(clinic.IgAppSecret)
                ? clinic.IgAppSecret
                : clinic.WaAppSecret;
            var usedWaFallback = string.IsNullOrWhiteSpace(clinic.IgAppSecret) && !string.IsNullOrWhiteSpace(clinic.WaAppSecret);

            if (string.IsNullOrWhiteSpace(appSecret))
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] Clínica {Clinic} sem App Secret — HMAC NÃO validado (modo bypass).",
                    clinic.Id);
                try { await ProcessMessagesAsync(root, clinic, rootObject); }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[IG-WEBHOOK] Erro ao processar (bypass) clínica {Clinic}.", clinic.Id);
                }
                return Ok();
            }

            if (usedWaFallback)
                _logger.LogInformation("[IG-WEBHOOK] Clínica {Clinic} usando WaAppSecret como fallback.", clinic.Id);

            var (sigValid, sigDetail) = ValidateSignatureDetailed(rawBytes, appSecret, signatureHeader);
            if (!sigValid)
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] Assinatura inválida para {Clinic}. Motivo: {Reason}.",
                    clinic.Id, sigDetail);
                await ProbeSignatureAgainstAllSecretsAsync(rawBytes, signatureHeader, "assinatura-invalida");
                return Ok();
            }

            try { await ProcessMessagesAsync(root, clinic, rootObject); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[IG-WEBHOOK] Erro ao processar mensagens para {Clinic}.", clinic.Id);
            }

            return Ok();
        }
    }

    // ─── Logs estruturados (não vazam token) ─────────────────────────────────

    private void LogStructuredDiagnostics(string? rootObject, JsonElement root)
    {
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return;

        foreach (var entry in entries.EnumerateArray())
        {
            var entryId = entry.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
            var hasMessaging = entry.TryGetProperty("messaging", out var messaging) && messaging.ValueKind == JsonValueKind.Array;
            var hasChanges   = entry.TryGetProperty("changes",   out var changes)   && changes.ValueKind   == JsonValueKind.Array;

            if (hasMessaging)
            {
                foreach (var evt in messaging.EnumerateArray())
                {
                    var diag = InstagramWebhookPayloadParser.Diagnose(evt, entryId, rootObject);
                    _logger.LogInformation("[IG-DIAG] (messaging[]) {Diag}", InstagramWebhookPayloadParser.Render(diag));
                }
            }

            if (hasChanges)
            {
                foreach (var change in changes.EnumerateArray())
                {
                    var field = change.TryGetProperty("field", out var fEl) ? fEl.GetString() : null;
                    if (!change.TryGetProperty("value", out var value) || value.ValueKind != JsonValueKind.Object)
                    {
                        _logger.LogInformation("[IG-DIAG] (changes[]) field={Field} value=(missing)", field ?? "(null)");
                        continue;
                    }
                    var diag = InstagramWebhookPayloadParser.Diagnose(value, entryId, rootObject);
                    _logger.LogInformation("[IG-DIAG] (changes[]) field={Field} {Diag}", field ?? "(null)", InstagramWebhookPayloadParser.Render(diag));
                }
            }

            if (!hasMessaging && !hasChanges)
                _logger.LogInformation("[IG-DIAG] entry={EntryId} sem messaging[] nem changes[]", entryId ?? "(null)");
        }
    }

    // ─── Helpers de payload ──────────────────────────────────────────────────

    private static List<string> ExtractRecipientIdentifiers(JsonElement root)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return ids.ToList();

        foreach (var entry in entries.EnumerateArray())
        {
            if (entry.TryGetProperty("id", out var idEl)) AddRecipientIdentifier(ids, idEl.GetString());

            if (entry.TryGetProperty("messaging", out var messaging) && messaging.ValueKind == JsonValueKind.Array)
            {
                foreach (var event_ in messaging.EnumerateArray())
                {
                    if (event_.TryGetProperty("recipient", out var recipientEl) &&
                        recipientEl.TryGetProperty("id", out var recipientIdEl))
                        AddRecipientIdentifier(ids, recipientIdEl.GetString());
                }
            }

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
        if (!string.IsNullOrWhiteSpace(candidate)) ids.Add(candidate);
    }

    // ─── HMAC validation (preservado da versão anterior) ─────────────────────

    private static (bool ok, string detail) ValidateSignatureDetailed(byte[] rawBytes, string? appSecret, string? signatureHeader)
    {
        var secret = InstagramService.SanitizeToken(appSecret);
        if (string.IsNullOrWhiteSpace(secret))    return (false, "App Secret vazio após sanitização.");
        if (string.IsNullOrWhiteSpace(signatureHeader)) return (false, "Header X-Hub-Signature-256 ausente.");

        const string prefix = "sha256=";
        if (!signatureHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return (false, $"Header não começa com 'sha256='.");

        var received = signatureHeader[prefix.Length..];
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(rawBytes);
        var expected = Convert.ToHexString(hash).ToLowerInvariant();

        var receivedBytes = Encoding.UTF8.GetBytes(received.ToLowerInvariant());
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var ok = receivedBytes.Length == expectedBytes.Length &&
                 CryptographicOperations.FixedTimeEquals(receivedBytes, expectedBytes);

        return ok ? (true, "") : (false, "HMAC não bateu.");
    }

    private async Task ProbeSignatureAgainstAllSecretsAsync(byte[] rawBytes, string? signatureHeader, string reason)
    {
        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            _logger.LogWarning("[IG-WEBHOOK] DIAGNÓSTICO ({Reason}): signatureHeader ausente, brute-force pulado.", reason);
            return;
        }

        var allClinics = await _db.Clinics
            .Where(c => c.IgAppSecret != null || c.WaAppSecret != null)
            .Select(c => new { c.Id, c.Name, c.IgAppSecret, c.WaAppSecret })
            .ToListAsync();

        var anyMatch = false;
        foreach (var c in allClinics)
        {
            foreach (var (field, secret) in new[] { ("IgAppSecret", c.IgAppSecret), ("WaAppSecret", c.WaAppSecret) })
            {
                if (string.IsNullOrWhiteSpace(secret)) continue;
                var (ok, _) = ValidateSignatureDetailed(rawBytes, secret, signatureHeader);
                if (ok)
                {
                    anyMatch = true;
                    _logger.LogWarning(
                        "[IG-WEBHOOK] DIAGNÓSTICO ({Reason}): HMAC bate com {Field} da clínica {OtherId} ({OtherName}).",
                        reason, field, c.Id, c.Name);
                }
            }
        }

        if (!anyMatch)
        {
            _logger.LogWarning(
                "[IG-WEBHOOK] DIAGNÓSTICO ({Reason}): nenhum secret no banco bate com a assinatura recebida. " +
                "Provável: app diferente, body modificado por proxy, ou subscribe feito por outro app.", reason);
        }
    }

    // ─── Processamento de eventos ────────────────────────────────────────────

    private async Task ProcessMessagesAsync(JsonElement root, Clinic clinic, string? rootObject)
    {
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return;

        foreach (var entry in entries.EnumerateArray())
        {
            var entryId = entry.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;

            if (entry.TryGetProperty("messaging", out var messaging) && messaging.ValueKind == JsonValueKind.Array)
            {
                foreach (var evt in messaging.EnumerateArray())
                    await ProcessSingleMessageEventAsync(evt, clinic, entryId, rootObject);
            }

            if (entry.TryGetProperty("changes", out var changes) && changes.ValueKind == JsonValueKind.Array)
            {
                foreach (var change in changes.EnumerateArray())
                {
                    var field = change.TryGetProperty("field", out var fEl) ? fEl.GetString() : null;
                    if (!string.Equals(field, "messages", StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogInformation("[IG-WEBHOOK] Change ignorado (field={Field}).", field ?? "(null)");
                        continue;
                    }
                    if (!change.TryGetProperty("value", out var value) || value.ValueKind != JsonValueKind.Object)
                        continue;

                    await ProcessSingleMessageEventAsync(value, clinic, entryId, rootObject);
                }
            }
        }

        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// REGRAS:
    ///  - `message` é a fonte primária de novas DMs.
    ///  - `message_edit` (com num_edit=0 e SEM sender) é APENAS diagnóstico —
    ///    NÃO importa nem dispara fetch por mid (a menos que a config
    ///    Instagram:EnableMidFallbackLookup esteja ligada).
    ///  - `is_echo`, `read`, `delivery`, `postback`, `reaction` são logados e ignorados.
    /// </summary>
    private async Task ProcessSingleMessageEventAsync(JsonElement evt, Clinic clinic, string? entryId, string? rootObject)
    {
        var diag = InstagramWebhookPayloadParser.Diagnose(evt, entryId, rootObject);

        // ── 1) Caminho primário: message com sender + (text|attachment) ─────
        if (diag.HasMessage)
        {
            if (diag.IsEcho)
            {
                _logger.LogInformation("[IG-WEBHOOK] Echo ignorado. mid={Mid}", diag.Mid ?? "(null)");
                return;
            }

            if (string.IsNullOrWhiteSpace(diag.Mid))
            {
                _logger.LogWarning("[IG-WEBHOOK] Mensagem sem mid — ignorada.");
                return;
            }

            if (await _db.PatientMessages.AnyAsync(m => m.ClinicId == clinic.Id && m.ExternalMessageId == diag.Mid))
            {
                _logger.LogInformation("[IG-WEBHOOK] Mensagem {Mid} já importada — ignorada.", diag.Mid);
                return;
            }

            if (string.IsNullOrWhiteSpace(diag.SenderId))
            {
                _logger.LogWarning("[IG-WEBHOOK] message sem sender.id — ignorada. mid={Mid}", diag.Mid);
                return;
            }

            var content = ExtractMessageContent(evt.GetProperty("message"))
                          ?? "[Mensagem Instagram não textual]";
            var ts = diag.Timestamp.HasValue ? ParseTimestamp(diag.Timestamp.Value) : null;
            var patient = await FindOrCreatePatientByIgSenderAsync(clinic, diag.SenderId);

            _db.PatientMessages.Add(new PatientMessage
            {
                Id                = Guid.NewGuid(),
                PatientId         = patient.Id,
                ClinicId          = clinic.Id,
                Content           = content,
                Direction         = "IN",
                Source            = "INSTAGRAM",
                IsRead            = false,
                ExternalMessageId = diag.Mid,
                ExternalStatus    = "received",
                ExternalProvider  = "INSTAGRAM",
                ExternalTimestamp = ts,
                CreatedAt         = ts ?? DateTime.UtcNow,
            });

            _logger.LogInformation(
                "[IG-WEBHOOK] message importada. mid={Mid} sender={Sender} clinic={Clinic} preview={Preview}",
                diag.Mid, diag.SenderId, clinic.Id,
                content.Length > 80 ? content[..80] + "..." : content);
            return;
        }

        // ── 2) message_edit: APENAS diagnóstico (não tenta importar) ────────
        if (diag.HasMessageEdit)
        {
            // Edição de mensagem existente (num_edit > 0) é informativa.
            if (diag.NumEdit is int n && n > 0)
            {
                _logger.LogInformation(
                    "[IG-WEBHOOK] message_edit (edição real, num_edit={NumEdit}) ignorado. mid={Mid}",
                    n, diag.Mid ?? "(null)");
                return;
            }

            // num_edit=0 com sender + text inline: a Meta entregou tudo no edit;
            // importamos como fallback bom (não usa Graph API).
            if (diag.HasSender && diag.HasText && !string.IsNullOrWhiteSpace(diag.Mid))
            {
                if (await _db.PatientMessages.AnyAsync(m => m.ClinicId == clinic.Id && m.ExternalMessageId == diag.Mid))
                {
                    _logger.LogInformation("[IG-WEBHOOK] message_edit {Mid} já importada — ignorada.", diag.Mid);
                    return;
                }

                var ts = diag.Timestamp.HasValue ? ParseTimestamp(diag.Timestamp.Value) : null;
                var content = evt.GetProperty("message_edit").TryGetProperty("text", out var tEl)
                    ? tEl.GetString() ?? "[Mensagem Instagram não textual]"
                    : "[Mensagem Instagram não textual]";
                var patient = await FindOrCreatePatientByIgSenderAsync(clinic, diag.SenderId!);

                _db.PatientMessages.Add(new PatientMessage
                {
                    Id                = Guid.NewGuid(),
                    PatientId         = patient.Id,
                    ClinicId          = clinic.Id,
                    Content           = content,
                    Direction         = "IN",
                    Source            = "INSTAGRAM",
                    IsRead            = false,
                    ExternalMessageId = diag.Mid,
                    ExternalStatus    = "received",
                    ExternalProvider  = "INSTAGRAM",
                    ExternalTimestamp = ts,
                    CreatedAt         = ts ?? DateTime.UtcNow,
                });
                _logger.LogInformation(
                    "[IG-WEBHOOK] message_edit (num_edit=0) importada inline. mid={Mid} sender={Sender}",
                    diag.Mid, diag.SenderId);
                return;
            }

            // Caso clássico: message_edit incompleto (sem sender ou sem texto).
            // Por padrão, NÃO buscamos mais via Graph — só logamos.
            _logger.LogWarning(
                "[IG-WEBHOOK] message_edit DIAGNÓSTICO. mid={Mid} hasSender={HasSender} hasText={HasText} numEdit={NumEdit}. " +
                "Mensagem real deve chegar como `message`. Verifique no Meta Developers se o webhook do Page/Messenger está ativo " +
                "com o campo `messages` subscrito.",
                diag.Mid ?? "(null)", diag.HasSender, diag.HasText, diag.NumEdit?.ToString() ?? "-");

            // Fallback opcional, ativável via config — útil pra investigação.
            if (_enableMidFallback &&
                !string.IsNullOrWhiteSpace(diag.Mid) &&
                !string.IsNullOrWhiteSpace(clinic.IgAccessToken))
            {
                var token = InstagramService.SanitizeToken(clinic.IgAccessToken);
                if (string.IsNullOrWhiteSpace(token)) return;

                _logger.LogInformation("[IG-WEBHOOK] Fallback ativo: tentando recuperar mid={Mid} via Graph.", diag.Mid);
                var (text, senderId, ts) = await _client.FetchMessageInfoByMidAsync(_client.DefaultMode, diag.Mid!, token!);
                if (string.IsNullOrWhiteSpace(senderId))
                {
                    _logger.LogWarning(
                        "[IG-WEBHOOK] Fallback retornou sem sender. mid={Mid}.",
                        diag.Mid);
                    return;
                }

                if (await _db.PatientMessages.AnyAsync(m => m.ClinicId == clinic.Id && m.ExternalMessageId == diag.Mid))
                    return;

                var content = text ?? "[Mensagem Instagram não textual]";
                var patient = await FindOrCreatePatientByIgSenderAsync(clinic, senderId!);

                _db.PatientMessages.Add(new PatientMessage
                {
                    Id                = Guid.NewGuid(),
                    PatientId         = patient.Id,
                    ClinicId          = clinic.Id,
                    Content           = content,
                    Direction         = "IN",
                    Source            = "INSTAGRAM",
                    IsRead            = false,
                    ExternalMessageId = diag.Mid,
                    ExternalStatus    = "received",
                    ExternalProvider  = "INSTAGRAM",
                    ExternalTimestamp = ts,
                    CreatedAt         = ts ?? DateTime.UtcNow,
                });
                _logger.LogInformation("[IG-WEBHOOK] Fallback recuperou mid={Mid} sender={Sender}.", diag.Mid, senderId);
            }

            return;
        }

        // ── 3) Outros eventos: log e ignora ─────────────────────────────────
        _logger.LogInformation(
            "[IG-WEBHOOK] Evento ignorado (kind={Kind}). entry={Entry}",
            diag.EventKind, diag.EntryId ?? "(null)");
    }

    private async Task<Patient> FindOrCreatePatientByIgSenderAsync(Clinic clinic, string igSenderId)
    {
        var existing = await _db.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.ClinicId == clinic.Id && p.IsActive && p.IgUserId == igSenderId);
        if (existing != null) return existing;

        string? igName = null;
        var token = InstagramService.SanitizeToken(clinic.IgAccessToken);
        if (!string.IsNullOrWhiteSpace(token))
            igName = await _client.FetchProfileNameAsync(_client.DefaultMode, igSenderId, token!);

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
        _logger.LogInformation("Instagram: novo paciente criado para sender {Sender} clínica {Clinic}.", igSenderId, clinic.Id);
        return patient;
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

    private static DateTime? ParseTimestamp(long value)
    {
        try
        {
            return value > 9_999_999_999
                ? DateTimeOffset.FromUnixTimeMilliseconds(value).UtcDateTime
                : DateTimeOffset.FromUnixTimeSeconds(value).UtcDateTime;
        }
        catch { return null; }
    }
}
