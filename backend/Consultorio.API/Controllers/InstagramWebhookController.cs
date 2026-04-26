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
    private readonly InstagramService _instagram;
    private readonly string _graphBaseUrl;
    private readonly string _graphVersion;
    private readonly bool _allowMessageEditMidFallback;

    public InstagramWebhookController(AppDbContext db, ILogger<InstagramWebhookController> logger, IConfiguration config, InstagramService instagram)
    {
        _db = db;
        _logger = logger;
        _instagram = instagram;
        _graphBaseUrl = (config["Instagram:FacebookGraphBaseUrl"] ?? config["Instagram:GraphBaseUrl"] ?? "https://graph.facebook.com").TrimEnd('/');
        _graphVersion = config["Instagram:GraphVersion"] ?? "v23.0";
        _allowMessageEditMidFallback = instagram.AllowMessageEditMidFallback;
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
        // ⚠️ IMPORTANTE: lemos o body como bytes BRUTOS (não como string).
        // O HMAC da Meta é calculado sobre os bytes RAW que ela envia. Se passarmos
        // por StreamReader UTF-8 e depois Encoding.UTF8.GetBytes(), em casos com
        // emojis/surrogate pairs/BOM os bytes podem mudar e o HMAC quebra.
        await using var ms = new MemoryStream();
        await Request.Body.CopyToAsync(ms);
        var rawBytes = ms.ToArray();
        var rawBody  = Encoding.UTF8.GetString(rawBytes);

        // Log inicial: sabemos que o webhook foi *chamado*. Útil pra confirmar
        // que a Meta está mandando algo (vs "nem chega").
        var signatureHeader = Request.Headers["X-Hub-Signature-256"].FirstOrDefault();
        var contentType     = Request.Headers["Content-Type"].FirstOrDefault();
        var userAgent       = Request.Headers["User-Agent"].FirstOrDefault();
        var forwardedFor    = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        var via             = Request.Headers["Via"].FirstOrDefault();
        var bodyPreview     = string.IsNullOrEmpty(rawBody)
            ? "(empty)"
            : rawBody.Length > 2000 ? rawBody[..2000] + "...[truncated]" : rawBody;

        // SHA-256 do body cru (sem secret) — útil para confirmar que os bytes não foram modificados.
        var bodySha = Convert.ToHexString(SHA256.HashData(rawBytes)).ToLowerInvariant();

        _logger.LogInformation(
            "[IG-WEBHOOK] POST received. ContentLength: {ContentLength}. Bytes: {Bytes}. Chars: {Chars}. Body SHA-256: {Sha}. Content-Type: {ContentType}. User-Agent: {UserAgent}. X-Forwarded-For: {Fwd}. Via: {Via}. Signature header: {Signature}. Body preview: {Body}",
            Request.ContentLength?.ToString() ?? "(null)",
            rawBytes.Length,
            rawBody?.Length ?? 0,
            bodySha.Length > 16 ? bodySha[..16] : bodySha,
            contentType ?? "(none)",
            userAgent ?? "(none)",
            forwardedFor ?? "(none)",
            via ?? "(none)",
            string.IsNullOrWhiteSpace(signatureHeader) ? "(missing)" : signatureHeader.Length > 40 ? signatureHeader[..40] + "..." : signatureHeader,
            bodyPreview);

        if (rawBytes.Length == 0)
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

                // Meta dashboard test payloads use synthetic IDs, so they do not
                // match real clinics. Still probe the signature so those tests can
                // confirm whether this endpoint has the right App Secret configured.
                await ProbeSignatureAgainstAllSecretsAsync(rawBytes, signatureHeader, "payload-sem-clinica");
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
                // ⚠️ MODO SEM VALIDAÇÃO: App Secret não configurado.
                // Processa as mensagens sem verificar a assinatura HMAC.
                // Para reativar a validação: configure IgAppSecret (ou WaAppSecret) na clínica.
                _logger.LogWarning(
                    "[IG-WEBHOOK] Clínica {ClinicId} sem App Secret configurado — HMAC NÃO validado. Processando mensagens no modo bypass.",
                    clinic.Id);
                try
                {
                    await ProcessMessagesAsync(root, clinic);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[IG-WEBHOOK] Erro ao processar mensagens para clínica {ClinicId} (modo bypass).", clinic.Id);
                }
                return Ok();
            }

            if (usedWaFallback)
                _logger.LogInformation("[IG-WEBHOOK] Clínica {ClinicId} usando WaAppSecret como fallback (IgAppSecret não configurado).", clinic.Id);

            var (sigValid, sigDetail) = ValidateSignatureDetailed(rawBytes, appSecret, signatureHeader);
            if (!sigValid)
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] Assinatura inválida para clínica {ClinicId}. Motivo: {Reason}. AppSecret source: {Source}. Iniciando diagnóstico brute-force...",
                    clinic.Id, sigDetail, usedWaFallback ? "WaAppSecret (fallback)" : "IgAppSecret");

                // 🔍 DIAGNÓSTICO: testa o HMAC contra TODOS os secrets do banco.
                // Se algum bater, o problema é match de clínica errada.
                // Se NENHUM bater, é certo que o secret correto NÃO está no banco
                // (foi regenerado, ou está em outro app, ou body foi modificado por proxy).
                await ProbeSignatureAgainstAllSecretsAsync(rawBytes, signatureHeader, "assinatura-invalida");

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

    private static (bool ok, string detail) ValidateSignatureDetailed(byte[] rawBytes, string? appSecret, string? signatureHeader)
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
        // ⚠️ Usa rawBytes diretamente — NÃO re-encoda a partir da string (preserva bytes originais).
        var hash = hmac.ComputeHash(rawBytes);
        var expected = Convert.ToHexString(hash).ToLowerInvariant();

        var receivedBytes = Encoding.UTF8.GetBytes(received.ToLowerInvariant());
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var ok = receivedBytes.Length == expectedBytes.Length &&
                 CryptographicOperations.FixedTimeEquals(receivedBytes, expectedBytes);

        if (ok) return (true, "");
        // Não logamos o secret/HMAC completo por segurança — apenas os primeiros caracteres.
        var recvPrev = received.Length > 12 ? received[..12] + "..." : received;
        var expPrev  = expected.Length > 12 ? expected[..12] + "..." : expected;
        var secretLen = secret.Length;
        var secretPrev = secret.Length > 4 ? secret[..4] + "***" : "***";
        return (false, $"HMAC não bateu. received={recvPrev} expected={expPrev} secretLen={secretLen} secretPrev={secretPrev}. Prováveis causas: App Secret errado, body mutilado por proxy, ou Page/App diferentes.");
    }

    /// <summary>
    /// Brute-force diagnóstico: tenta validar a assinatura HMAC com TODOS os secrets
    /// (IgAppSecret e WaAppSecret) de TODAS as clínicas no banco. Se algum bater, sabemos
    /// o segredo está em outra clínica. Se NENHUM bater, sabemos que o secret correto
    /// NÃO está armazenado em lugar nenhum do banco — então é outro app que assinou,
    /// ou o body foi modificado por um proxy entre Meta e o app.
    /// </summary>
    private async Task ProbeSignatureAgainstAllSecretsAsync(byte[] rawBytes, string? signatureHeader, string reason)
    {
        _logger.LogInformation("[IG-WEBHOOK] DIAGNOSTICO-HMAC: iniciando probe. Reason={Reason}", reason);

        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            _logger.LogWarning("[IG-WEBHOOK] DIAGNÓSTICO: signatureHeader ausente, brute-force pulado.");
            return;
        }

        var receivedDigest = ExtractSignatureDigest(signatureHeader);
        var receivedPrev = PreviewHex(receivedDigest);

        var allClinics = await _db.Clinics
            .Where(c => c.IgAppSecret != null || c.WaAppSecret != null)
            .Select(c => new { c.Id, c.Name, c.IgAppSecret, c.WaAppSecret })
            .ToListAsync();

        _logger.LogInformation("[IG-WEBHOOK] DIAGNÓSTICO: testando assinatura contra {Count} clínicas com secrets configurados.", allClinics.Count);

        var anyMatch = false;
        foreach (var c in allClinics)
        {
            if (!string.IsNullOrWhiteSpace(c.IgAppSecret))
            {
                LogSignatureProbeCandidate(rawBytes, c.IgAppSecret, receivedPrev, c.Id, c.Name, "IgAppSecret", reason);
                var (ok, _) = ValidateSignatureDetailed(rawBytes, c.IgAppSecret, signatureHeader);
                if (ok)
                {
                    anyMatch = true;
                    _logger.LogWarning(
                        "[IG-WEBHOOK] ✅ DIAGNÓSTICO: HMAC bate com IgAppSecret da clínica {OtherId} ({OtherName}). " +
                        "Causa provável: webhook recebido para clínica errada (matching de Page/Account ID problemático).",
                        c.Id, c.Name);
                }
            }
            if (!string.IsNullOrWhiteSpace(c.WaAppSecret) && !string.Equals(c.IgAppSecret, c.WaAppSecret, StringComparison.Ordinal))
            {
                LogSignatureProbeCandidate(rawBytes, c.WaAppSecret, receivedPrev, c.Id, c.Name, "WaAppSecret", reason);
                var (ok, _) = ValidateSignatureDetailed(rawBytes, c.WaAppSecret, signatureHeader);
                if (ok)
                {
                    anyMatch = true;
                    _logger.LogWarning(
                        "[IG-WEBHOOK] ✅ DIAGNÓSTICO: HMAC bate com WaAppSecret da clínica {OtherId} ({OtherName}). " +
                        "Causa provável: webhook é de um app cujo secret está salvo no campo WhatsApp.",
                        c.Id, c.Name);
                }
            }
        }

        if (!anyMatch)
        {
            _logger.LogWarning(
                "[IG-WEBHOOK] ❌ DIAGNÓSTICO: NENHUM secret salvo no banco bate com a assinatura recebida. " +
                "Causas possíveis: " +
                "(1) o webhook é assinado por um App que NÃO está cadastrado em NENHUMA clínica; " +
                "(2) a URL de webhook está cadastrada em VÁRIOS apps Meta e quem está chamando é o app errado; " +
                "(3) há um proxy reverso modificando o body antes de chegar aqui (bytes diferentes); " +
                "(4) o subscribe foi feito com access token de outro app (webhook registrado para o app dono do token, não para o app cujo secret você tem). " +
                "Para resolver: verifique no portal Meta quais apps têm essa URL como webhook ativo, e qual está realmente subscrito via GET /{page-id}/subscribed_apps.");
        }
    }

    private void LogSignatureProbeCandidate(
        byte[] rawBytes,
        string? appSecret,
        string receivedPrev,
        Guid clinicId,
        string clinicName,
        string field,
        string reason)
    {
        var secret = InstagramService.SanitizeToken(appSecret);
        if (string.IsNullOrWhiteSpace(secret))
            return;

        var expected = ComputeHmacSha256Hex(rawBytes, secret);
        var secretFingerprint = ComputeSha256Hex(Encoding.UTF8.GetBytes(secret));

        _logger.LogInformation(
            "[IG-WEBHOOK] DIAGNOSTICO-HMAC ({Reason}): candidato={Field} clinic={ClinicId} name={ClinicName} secretLen={SecretLen} secretFp={SecretFp} received={Received} expected={Expected}",
            reason,
            field,
            clinicId,
            clinicName,
            secret.Length,
            PreviewHex(secretFingerprint),
            receivedPrev,
            PreviewHex(expected));
    }

    private static string ExtractSignatureDigest(string signatureHeader)
    {
        const string prefix = "sha256=";
        var value = signatureHeader.Trim();
        return value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? value[prefix.Length..].Trim()
            : value;
    }

    private static string ComputeHmacSha256Hex(byte[] rawBytes, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(rawBytes)).ToLowerInvariant();
    }

    private static string ComputeSha256Hex(byte[] bytes) =>
        Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

    private static string PreviewHex(string? value, int length = 12)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "(none)";
        return value.Length > length ? value[..length] + "..." : value;
    }

    private async Task ProcessMessagesAsync(JsonElement root, Clinic clinic)
    {
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return;

        var objectName = root.TryGetProperty("object", out var objectEl) ? objectEl.GetString() ?? "" : "";

        foreach (var entry in entries.EnumerateArray())
        {
            var entryId = entry.TryGetProperty("id", out var entryIdEl) ? entryIdEl.GetString() : null;
            // ── Formato A: Messenger Platform (object=page) ────────────────────
            // entry[].messaging[] → cada elemento é um evento de mensagem diretamente
            if (entry.TryGetProperty("messaging", out var messaging) && messaging.ValueKind == JsonValueKind.Array)
            {
                _logger.LogInformation("[IG-WEBHOOK] Entry usando formato Messenger (messaging[]). Count: {Count}", messaging.GetArrayLength());
                foreach (var event_ in messaging.EnumerateArray())
                {
                    var diagnostics = InstagramWebhookPayloadParser.BuildDiagnostics(objectName, entryId, "messaging", event_);
                    LogEventDiagnostics(diagnostics);
                    await ProcessSingleMessageEventAsync(event_, clinic, diagnostics);
                }
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
                    var diagnostics = InstagramWebhookPayloadParser.BuildDiagnostics(objectName, entryId, field, value);
                    LogEventDiagnostics(diagnostics);
                    await ProcessSingleMessageEventAsync(value, clinic, diagnostics);
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
    // ─── Busca conteúdo e remetente de uma mensagem via Graph API (mid) ─────────
    // Necessário para eventos message_edit, que não incluem texto no payload.
    private async Task<(string? text, string? senderId, DateTime? timestamp)>
        FetchMessageInfoByMidAsync(string mid, string accessToken, string? pageId, string? igAccountId)
    {
        var direct = await FetchMessageInfoByMidDirectAsync(mid, accessToken);
        if (!string.IsNullOrWhiteSpace(direct.senderId))
            return direct;

        if (!string.IsNullOrWhiteSpace(pageId))
        {
            var fromConversations = await FetchMessageInfoFromRecentConversationsAsync(mid, accessToken, pageId, "page");
            if (!string.IsNullOrWhiteSpace(fromConversations.senderId))
                return fromConversations;
        }

        if (!string.IsNullOrWhiteSpace(igAccountId) &&
            !string.Equals(igAccountId, pageId, StringComparison.Ordinal))
        {
            var fromConversations = await FetchMessageInfoFromRecentConversationsAsync(mid, accessToken, igAccountId, "instagram-account");
            if (!string.IsNullOrWhiteSpace(fromConversations.senderId))
                return fromConversations;
        }

        return direct;
    }

    private async Task<(string? text, string? senderId, DateTime? timestamp)>
        FetchMessageInfoByMidDirectAsync(string mid, string accessToken)
    {
        try
        {
            using var http = new HttpClient();
            var fields = Uri.EscapeDataString("id,message,from,to,created_time");
            var url = $"{_graphBaseUrl}/{_graphVersion}/{Uri.EscapeDataString(mid)}?fields={fields}&access_token={Uri.EscapeDataString(accessToken)}";
            var resp = await http.GetAsync(url);
            var raw = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] Falha ao buscar message_edit por mid direto. Mid={Mid} Status={Status} Error={Error}",
                    mid,
                    (int)resp.StatusCode,
                    ExtractGraphError(raw));
                return (null, null, null);
            }

            using var doc = JsonDocument.Parse(raw);
            var info = ParseGraphMessageInfo(doc.RootElement);
            if (string.IsNullOrWhiteSpace(info.senderId))
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] Graph retornou message_edit sem from.id no fetch direto. Mid={Mid} Keys={Keys} HasMessage={HasMessage}",
                    mid,
                    string.Join(",", doc.RootElement.EnumerateObject().Select(p => p.Name)),
                    doc.RootElement.TryGetProperty("message", out _));
            }

            return info;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[IG-WEBHOOK] Excecao ao buscar message_edit por mid direto. Mid={Mid}", mid);
            return (null, null, null);
        }
    }

    private async Task<(string? text, string? senderId, DateTime? timestamp)>
        FetchMessageInfoFromRecentConversationsAsync(string mid, string accessToken, string ownerId, string ownerKind)
    {
        try
        {
            using var http = new HttpClient();
            var fields = Uri.EscapeDataString("messages.limit(20){id,message,from,to,created_time}");
            var url = $"{_graphBaseUrl}/{_graphVersion}/{Uri.EscapeDataString(ownerId)}/conversations?platform=instagram&limit=20&fields={fields}&access_token={Uri.EscapeDataString(accessToken)}";
            var resp = await http.GetAsync(url);
            var raw = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] Falha ao buscar message_edit em conversas recentes. Mid={Mid} OwnerKind={OwnerKind} OwnerId={OwnerId} Status={Status} Error={Error}",
                    mid,
                    ownerKind,
                    ownerId,
                    (int)resp.StatusCode,
                    ExtractGraphError(raw));
                return (null, null, null);
            }

            using var doc = JsonDocument.Parse(raw);
            if (!doc.RootElement.TryGetProperty("data", out var conversations) ||
                conversations.ValueKind != JsonValueKind.Array)
                return (null, null, null);

            foreach (var conversation in conversations.EnumerateArray())
            {
                if (!conversation.TryGetProperty("messages", out var messages) ||
                    !messages.TryGetProperty("data", out var messageItems) ||
                    messageItems.ValueKind != JsonValueKind.Array)
                    continue;

                foreach (var message in messageItems.EnumerateArray())
                {
                    var id = message.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
                    var itemMid = message.TryGetProperty("mid", out var midEl) ? midEl.GetString() : null;
                    if (!string.Equals(id, mid, StringComparison.Ordinal) &&
                        !string.Equals(itemMid, mid, StringComparison.Ordinal))
                        continue;

                    var info = ParseGraphMessageInfo(message);
                    _logger.LogInformation("[IG-WEBHOOK] message_edit encontrado em conversas recentes. Mid={Mid}", mid);
                    return info;
                }
            }

            _logger.LogWarning(
                "[IG-WEBHOOK] message_edit nao encontrado nas conversas recentes. Mid={Mid} OwnerKind={OwnerKind} OwnerId={OwnerId}",
                mid,
                ownerKind,
                ownerId);
            return (null, null, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[IG-WEBHOOK] Excecao ao buscar message_edit em conversas recentes. Mid={Mid} OwnerKind={OwnerKind} OwnerId={OwnerId}", mid, ownerKind, ownerId);
            return (null, null, null);
        }
    }

    private static (string? text, string? senderId, DateTime? timestamp) ParseGraphMessageInfo(JsonElement message)
    {
        var text = message.TryGetProperty("message", out var mEl) ? mEl.GetString() : null;
        var senderId = TryExtractId(message, "from");

        DateTime? ts = null;
        if (message.TryGetProperty("created_time", out var tsEl) &&
            DateTime.TryParse(tsEl.GetString(), out var parsed))
            ts = parsed.ToUniversalTime();

        return (text, senderId, ts);
    }

    private static string? TryExtractId(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value))
            return null;

        if (value.ValueKind == JsonValueKind.Object)
        {
            if (value.TryGetProperty("id", out var idEl))
                return idEl.GetString();

            if (value.TryGetProperty("data", out var dataEl) &&
                dataEl.ValueKind == JsonValueKind.Array &&
                dataEl.GetArrayLength() > 0 &&
                dataEl[0].ValueKind == JsonValueKind.Object &&
                dataEl[0].TryGetProperty("id", out var dataIdEl))
                return dataIdEl.GetString();
        }

        if (value.ValueKind == JsonValueKind.Array &&
            value.GetArrayLength() > 0 &&
            value[0].ValueKind == JsonValueKind.Object &&
            value[0].TryGetProperty("id", out var firstIdEl))
            return firstIdEl.GetString();

        return value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    }

    private static string ExtractGraphError(string raw)
    {
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.TryGetProperty("error", out var err))
            {
                var message = err.TryGetProperty("message", out var msgEl) ? msgEl.GetString() : null;
                var code = err.TryGetProperty("code", out var codeEl) ? codeEl.ToString() : null;
                return string.IsNullOrWhiteSpace(code) ? message ?? "(sem mensagem)" : $"#{code}: {message}";
            }
        }
        catch
        {
        }

        return raw.Length > 300 ? raw[..300] + "..." : raw;
    }

    private void LogEventDiagnostics(InstagramWebhookEventDiagnostics d)
    {
        _logger.LogInformation(
            "[IG-WEBHOOK] EventDiag Object={Object} EntryId={EntryId} Field={Field} HasSender={HasSender} HasRecipient={HasRecipient} HasMessage={HasMessage} HasMessageEdit={HasMessageEdit} HasText={HasText} NumEdit={NumEdit} MessageId={MessageId}",
            d.Object,
            d.EntryId ?? "(null)",
            d.Field ?? "(null)",
            d.HasSender,
            d.HasRecipient,
            d.HasMessage,
            d.HasMessageEdit,
            d.HasText,
            d.NumEdit?.ToString() ?? "(null)",
            d.MessageId ?? "(null)");
    }

    private async Task ProcessSingleMessageEventAsync(JsonElement event_, Clinic clinic, InstagramWebhookEventDiagnostics? diagnostics = null)
    {
        // ── Formato message_edit com num_edit=0 ───────────────────────────────
        // Instagram envia um evento message_edit (num_edit=0) para toda mensagem
        // nova desde que o recurso de edição foi lançado. O texto não vem no payload
        // — precisamos buscá-lo via Graph API usando o mid.
        if (!event_.TryGetProperty("message", out var messageEl))
        {
            if (!event_.TryGetProperty("message_edit", out var editEl))
            {
                _logger.LogInformation("[IG-WEBHOOK] Evento sem 'message' nem 'message_edit' — ignorado.");
                return;
            }

            var numEdit = editEl.TryGetProperty("num_edit", out var nEl) && nEl.ValueKind == JsonValueKind.Number
                ? nEl.GetInt32() : -1;

            if (numEdit != 0)
            {
                _logger.LogInformation("[IG-WEBHOOK] message_edit ignorado (num_edit={NumEdit}, é edição de mensagem existente).", numEdit);
                return;
            }

            var editMid = editEl.TryGetProperty("mid", out var eMidEl) ? eMidEl.GetString() : null;
            if (string.IsNullOrWhiteSpace(editMid))
            {
                _logger.LogWarning("[IG-WEBHOOK] message_edit sem mid — ignorado.");
                return;
            }

            // Deduplicação
            if (await _db.PatientMessages.AnyAsync(m => m.ClinicId == clinic.Id && m.ExternalMessageId == editMid))
            {
                _logger.LogInformation("[IG-WEBHOOK] Mensagem {MessageId} já importada (via message_edit) — ignorada.", editMid);
                return;
            }

            var token = InstagramService.SanitizeToken(clinic.IgAccessToken);
            if (string.IsNullOrWhiteSpace(token) && _allowMessageEditMidFallback)
            {
                _logger.LogWarning("[IG-WEBHOOK] Sem access token para buscar conteúdo do message_edit {Mid}.", editMid);
                return;
            }

            _logger.LogInformation("[IG-WEBHOOK] message_edit (num_edit=0) detectado — buscando conteúdo via API para mid {Mid}.", editMid);
            var eventSenderId = event_.TryGetProperty("sender", out var editSenderEl) &&
                                editSenderEl.TryGetProperty("id", out var editSenderIdEl)
                ? editSenderIdEl.GetString()
                : null;
            var eventText = editEl.TryGetProperty("text", out var editTextEl)
                ? editTextEl.GetString()
                : null;
            var eventTs = event_.TryGetProperty("timestamp", out var editTimestampEl)
                ? ParseMetaTimestamp(editTimestampEl)
                : null;

            if (string.IsNullOrWhiteSpace(eventSenderId) || string.IsNullOrWhiteSpace(eventText))
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] message_edit incompleto recebido. Mid={Mid} HasSender={HasSender} HasText={HasText}. " +
                    "DMs reais devem chegar como evento 'message' com sender/recipient. " +
                    "Verifique no Meta Developers se a conta profissional esta subscrita ao campo 'messages' nesta URL.",
                    editMid,
                    !string.IsNullOrWhiteSpace(eventSenderId),
                    !string.IsNullOrWhiteSpace(eventText));

                if (!_allowMessageEditMidFallback)
                {
                    _logger.LogWarning(
                        "[IG-WEBHOOK] message_edit incompleto tratado apenas como diagnostico. Mid={Mid}. Fallback por mid desativado em Instagram:AllowMessageEditMidFallback.",
                        editMid);
                    return;
                }
            }

            (string? fetchedText, string? fetchedSenderId, DateTime? fetchedTs) = (null, null, null);
            if (_allowMessageEditMidFallback)
                (fetchedText, fetchedSenderId, fetchedTs) = await FetchMessageInfoByMidAsync(editMid, token!, clinic.IgPageId, clinic.IgAccountId);
            var editText = eventText ?? fetchedText;
            var editSenderId = eventSenderId ?? fetchedSenderId;
            var editTs = eventTs ?? fetchedTs;

            if (string.IsNullOrWhiteSpace(editSenderId))
            {
                _logger.LogWarning(
                    "[IG-WEBHOOK] Nao foi possivel obter senderId para message_edit {Mid}. " +
                    "O payload veio sem sender.id e a Graph API nao retornou a mensagem. " +
                    "Causa provavel: a Meta entregou apenas message_edit; confirme o evento 'messages' completo e as permissoes da conta profissional.",
                    editMid);
                return;
            }

            var editContent = editText ?? "[Mensagem Instagram não textual]";
            var editPatient = await FindOrCreatePatientByIgSenderAsync(clinic, editSenderId);

            _db.PatientMessages.Add(new PatientMessage
            {
                Id                = Guid.NewGuid(),
                PatientId         = editPatient.Id,
                ClinicId          = clinic.Id,
                Content           = editContent,
                Direction         = "IN",
                Source            = "INSTAGRAM",
                IsRead            = false,
                ExternalMessageId = editMid,
                ExternalStatus    = "received",
                ExternalProvider  = "INSTAGRAM",
                ExternalTimestamp = editTs,
                CreatedAt         = editTs ?? DateTime.UtcNow,
            });

            _logger.LogInformation(
                "[IG-WEBHOOK] Mensagem (message_edit→nova) {MessageId} processada. Clínica {ClinicId}. Sender: {SenderId}. Conteúdo: {Preview}",
                editMid, clinic.Id, editSenderId,
                editContent.Length > 80 ? editContent[..80] + "..." : editContent);
            return;
        }

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
            igName = await _instagram.FetchUserProfileNameAsync(igSenderId, clinic.IgAccessToken);
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
