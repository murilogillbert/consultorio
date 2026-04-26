using System.Text;
using System.Text.Json;

namespace Consultorio.API.Services;

/// <summary>
/// Modo da integração de mensagens com a Meta. A Meta tem 2 fluxos
/// distintos para DMs do Instagram, cada um com base URL e identificador
/// "owner" diferente. Manter um único modo canônico evita misturar URLs
/// (graph.facebook.com vs graph.instagram.com) pelo serviço.
/// </summary>
public enum InstagramApiMode
{
    /// <summary>
    /// Fluxo recomendado pela Meta para apps novos. Usa
    /// https://graph.instagram.com e o "owner" das chamadas é o
    /// Instagram Business Account ID (IgAccountId).
    /// </summary>
    InstagramLogin = 0,

    /// <summary>
    /// Fluxo legado via Page Access Token. Usa https://graph.facebook.com
    /// e o "owner" é o Facebook Page ID (IgPageId).
    /// </summary>
    FacebookPageLogin = 1,
}

public class MetaGraphCallResult
{
    public bool   IsSuccess  { get; init; }
    public int    StatusCode { get; init; }
    public string RawBody    { get; init; } = "";
    public string? ErrorMessage { get; init; }
}

public class InstagramAccountProbeResult
{
    public string  OwnerId           { get; init; } = "";
    public string  OwnerLabel        { get; init; } = "";
    public string  IgAccountId       { get; init; } = "";
    public string  IgUsername        { get; init; } = "";
    public string  PageId            { get; init; } = "";
    public string  PageName          { get; init; } = "";
    public InstagramApiMode Mode     { get; init; }
}

public class InstagramSendOutcome
{
    public string MessageId { get; init; } = "";
    public string RawBody   { get; init; } = "";
}

public class InstagramSubscriptionOutcome
{
    public bool          Ok                  { get; init; }
    public string        Detail              { get; init; } = "";
    public List<string>  SubscribedFields    { get; init; } = new();
    public string        SubscribeUrl        { get; init; } = "";
    public string        ConfirmUrl          { get; init; } = "";
    public string        OwnerId             { get; init; } = "";
    public InstagramApiMode Mode             { get; init; }
}

/// <summary>
/// Encapsula todas as chamadas HTTP para a Meta (Instagram Direct).
/// Mantém URL/versão num lugar só — quem chama escolhe o modo
/// (InstagramLogin / FacebookPageLogin) e o serviço resolve o resto.
/// </summary>
public class MetaInstagramMessagingClient
{
    private readonly HttpClient _http;
    private readonly ILogger<MetaInstagramMessagingClient>? _logger;
    private readonly string _graphVersion;
    private readonly string _igLoginBase;
    private readonly string _fbPageLoginBase;
    private readonly InstagramApiMode _defaultMode;

    public MetaInstagramMessagingClient(
        IConfiguration config,
        HttpClient http,
        ILogger<MetaInstagramMessagingClient>? logger = null)
    {
        _http = http;
        _logger = logger;
        _graphVersion    = config["Instagram:GraphVersion"]          ?? "v23.0";
        _igLoginBase     = (config["Instagram:GraphInstagramBaseUrl"] ?? "https://graph.instagram.com").TrimEnd('/');
        _fbPageLoginBase = (config["Instagram:GraphFacebookBaseUrl"]  ?? "https://graph.facebook.com").TrimEnd('/');
        _defaultMode     = ParseMode(config["Instagram:Mode"]);
    }

    public InstagramApiMode DefaultMode => _defaultMode;
    public string GraphVersion => _graphVersion;

    public static InstagramApiMode ParseMode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return InstagramApiMode.InstagramLogin;
        return value.Trim().ToLowerInvariant() switch
        {
            "facebookpagelogin" or "facebook" or "fb" or "page" => InstagramApiMode.FacebookPageLogin,
            _ => InstagramApiMode.InstagramLogin,
        };
    }

    public string BaseFor(InstagramApiMode mode) => mode switch
    {
        InstagramApiMode.FacebookPageLogin => _fbPageLoginBase,
        _                                  => _igLoginBase,
    };

    // ─── URL builders (públicos pra UI/diagnóstico exporem o endpoint efetivo) ───

    public string SendEndpoint(InstagramApiMode mode, string ownerId)
        => $"{BaseFor(mode)}/{_graphVersion}/{Uri.EscapeDataString(ownerId)}/messages";

    public string SubscribeEndpoint(InstagramApiMode mode, string ownerId)
        => $"{BaseFor(mode)}/{_graphVersion}/{Uri.EscapeDataString(ownerId)}/subscribed_apps";

    public string ConfirmSubscribedAppsEndpoint(InstagramApiMode mode, string ownerId)
        => $"{BaseFor(mode)}/{_graphVersion}/{Uri.EscapeDataString(ownerId)}/subscribed_apps";

    public string AccountProbeEndpoint(InstagramApiMode mode, string ownerId)
        => $"{BaseFor(mode)}/{_graphVersion}/{Uri.EscapeDataString(ownerId)}";

    public string ProfileEndpoint(InstagramApiMode mode, string igsid)
        => $"{BaseFor(mode)}/{_graphVersion}/{Uri.EscapeDataString(igsid)}";

    /// <summary>
    /// "Quem é o owner que entra na URL?" — depende do modo.
    /// InstagramLogin → IgAccountId (a conta Instagram Business).
    /// FacebookPageLogin → IgPageId (a página do Facebook).
    /// </summary>
    public static string ResolveOwnerId(InstagramApiMode mode, string? igAccountId, string? igPageId)
        => mode == InstagramApiMode.InstagramLogin
            ? (igAccountId ?? "")
            : (igPageId    ?? "");

    // ─── HTTP helpers ─────────────────────────────────────────────────────────

    /// <summary>
    /// Testa a conta — confirma que o token é válido e retorna PageId/IgAccountId/Username.
    /// Funciona para ambos os modos. No InstagramLogin a query inclui campos do próprio
    /// IG account; no FacebookPageLogin pede também instagram_business_account.
    /// </summary>
    public async Task<InstagramAccountProbeResult> ProbeAccountAsync(
        InstagramApiMode mode,
        string ownerId,
        string accessToken)
    {
        var targetId = string.IsNullOrWhiteSpace(ownerId) && mode == InstagramApiMode.InstagramLogin
            ? "me"
            : ownerId.Trim();

        if (string.IsNullOrWhiteSpace(targetId))
            throw new InstagramException(422,
                mode == InstagramApiMode.InstagramLogin
                    ? "Instagram Business Account ID nao configurado e nao foi possivel usar /me."
                    : "Facebook Page ID não configurado.");

        // Campos por modo: InstagramLogin retorna username/id; FacebookPageLogin
        // retorna a página + instagram_business_account.{id,username}.
        var fields = mode == InstagramApiMode.InstagramLogin
            ? "id,username,name"
            : "id,name,instagram_business_account{id,username}";

        var url = $"{AccountProbeEndpoint(mode, targetId)}" +
                  $"?fields={Uri.EscapeDataString(fields)}" +
                  $"&access_token={Uri.EscapeDataString(accessToken)}";

        var res = await _http.GetAsync(url);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
        {
            throw new InstagramException((int)res.StatusCode,
                ParseGraphError(raw) ?? $"Erro {(int)res.StatusCode} ao verificar conta na Meta.");
        }

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        if (mode == InstagramApiMode.InstagramLogin)
        {
            var igId       = root.TryGetProperty("id",       out var idEl)   ? idEl.GetString()   ?? "" : "";
            var igUsername = root.TryGetProperty("username", out var unEl)   ? unEl.GetString()   ?? "" : "";
            var label      = root.TryGetProperty("name",     out var nameEl) ? nameEl.GetString() ?? igUsername : igUsername;

            if (string.IsNullOrWhiteSpace(igId))
                throw new InstagramException(422,
                    "graph.instagram.com não retornou o ID da conta Instagram. Verifique o token e a permissão instagram_business_manage_messages.");

            return new InstagramAccountProbeResult
            {
                Mode        = mode,
                OwnerId     = igId,
                OwnerLabel  = label,
                IgAccountId = igId,
                IgUsername  = igUsername,
            };
        }
        else
        {
            var pageId   = root.TryGetProperty("id",   out var idEl)   ? idEl.GetString()   ?? "" : "";
            var pageName = root.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";

            if (!root.TryGetProperty("instagram_business_account", out var igEl) ||
                igEl.ValueKind != JsonValueKind.Object)
            {
                throw new InstagramException(422,
                    "A Página do Facebook informada não tem uma conta Instagram Business vinculada. " +
                    "Vincule pelo Meta Business Suite e tente novamente.");
            }

            var igId       = igEl.TryGetProperty("id",       out var igIdEl)   ? igIdEl.GetString()   ?? "" : "";
            var igUsername = igEl.TryGetProperty("username", out var igUserEl) ? igUserEl.GetString() ?? "" : "";

            if (string.IsNullOrWhiteSpace(igId))
                throw new InstagramException(422,
                    "A API do Meta não retornou o ID da conta Instagram Business. " +
                    "Verifique se o Page Access Token tem instagram_basic e instagram_manage_messages.");

            return new InstagramAccountProbeResult
            {
                Mode        = mode,
                OwnerId     = string.IsNullOrWhiteSpace(pageId) ? targetId : pageId,
                OwnerLabel  = pageName,
                PageId      = pageId,
                PageName    = pageName,
                IgAccountId = igId,
                IgUsername  = igUsername,
            };
        }
    }

    /// <summary>
    /// Assina a conta/página ao app para receber webhooks do campo `messages`
    /// (e os opcionais suportados). Confirma com GET /subscribed_apps.
    /// </summary>
    public async Task<InstagramSubscriptionOutcome> SubscribeWebhooksAsync(
        InstagramApiMode mode,
        string ownerId,
        string accessToken,
        IEnumerable<string> fields)
    {
        var fieldsList = fields.Where(f => !string.IsNullOrWhiteSpace(f)).Distinct().ToArray();
        var fieldsParam = Uri.EscapeDataString(string.Join(",", fieldsList));

        var subscribeUrl = $"{SubscribeEndpoint(mode, ownerId)}?subscribed_fields={fieldsParam}&access_token={Uri.EscapeDataString(accessToken)}";
        var confirmUrl   = $"{ConfirmSubscribedAppsEndpoint(mode, ownerId)}?access_token={Uri.EscapeDataString(accessToken)}";

        try
        {
            var subRes = await _http.PostAsync(subscribeUrl, content: null);
            var subRaw = await subRes.Content.ReadAsStringAsync();

            _logger?.LogInformation(
                "[IG-CLIENT] POST {OwnerId}/subscribed_apps mode={Mode} → {Status}. Body: {Body}",
                ownerId, mode, (int)subRes.StatusCode, subRaw);

            if (!subRes.IsSuccessStatusCode)
            {
                var err = ParseGraphError(subRaw) ?? $"HTTP {(int)subRes.StatusCode}";
                return new InstagramSubscriptionOutcome
                {
                    Ok           = false,
                    Detail       = err,
                    Mode         = mode,
                    OwnerId      = ownerId,
                    SubscribeUrl = StripToken(subscribeUrl),
                    ConfirmUrl   = StripToken(confirmUrl),
                };
            }

            var active = await ConfirmSubscribedFieldsAsync(mode, ownerId, accessToken);

            return new InstagramSubscriptionOutcome
            {
                Ok               = true,
                Detail           = active.Count == 0
                    ? "Subscrição feita, mas a Meta não retornou os campos ativos (verifique manualmente em Webhooks)."
                    : $"Campos ativos: {string.Join(", ", active)}",
                SubscribedFields = active,
                Mode             = mode,
                OwnerId          = ownerId,
                SubscribeUrl     = StripToken(subscribeUrl),
                ConfirmUrl       = StripToken(confirmUrl),
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex,
                "[IG-CLIENT] Exceção ao subscrever {OwnerId} no modo {Mode}.",
                ownerId, mode);

            return new InstagramSubscriptionOutcome
            {
                Ok           = false,
                Detail       = $"Exceção ao subscrever: {ex.Message}",
                Mode         = mode,
                OwnerId      = ownerId,
                SubscribeUrl = StripToken(subscribeUrl),
                ConfirmUrl   = StripToken(confirmUrl),
            };
        }
    }

    public async Task<List<string>> ConfirmSubscribedFieldsAsync(
        InstagramApiMode mode,
        string ownerId,
        string accessToken)
    {
        var url = $"{ConfirmSubscribedAppsEndpoint(mode, ownerId)}?access_token={Uri.EscapeDataString(accessToken)}";
        try
        {
            var res = await _http.GetAsync(url);
            var raw = await res.Content.ReadAsStringAsync();

            _logger?.LogInformation(
                "[IG-CLIENT] GET {OwnerId}/subscribed_apps mode={Mode} → {Status}. Body: {Body}",
                ownerId, mode, (int)res.StatusCode, raw);

            if (!res.IsSuccessStatusCode) return new List<string>();

            using var doc = JsonDocument.Parse(raw);
            return ExtractSubscribedFields(doc.RootElement);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex,
                "[IG-CLIENT] Falha ao confirmar subscribed_apps de {OwnerId} (mode={Mode}).",
                ownerId, mode);
            return new List<string>();
        }
    }

    /// <summary>
    /// Envia uma DM de texto. recipient.id deve ser o IGSID do paciente
    /// (Patient.IgUserId). Em InstagramLogin, a URL usa graph.instagram.com e o
    /// owner é o IG Business Account; em FacebookPageLogin é a Page.
    /// </summary>
    public async Task<InstagramSendOutcome> SendTextAsync(
        InstagramApiMode mode,
        string ownerId,
        string accessToken,
        string recipientIgsid,
        string text)
    {
        if (string.IsNullOrWhiteSpace(ownerId))
            throw new InstagramException(422,
                mode == InstagramApiMode.InstagramLogin
                    ? "Instagram Business Account ID não configurado."
                    : "Facebook Page ID não configurado.");

        if (string.IsNullOrWhiteSpace(recipientIgsid))
            throw new InstagramException(422, "Paciente sem ID do Instagram (IGSID) para resposta.");

        if (string.IsNullOrWhiteSpace(text))
            throw new InstagramException(422, "Mensagem não pode estar vazia.");

        var body = new
        {
            messaging_type = "RESPONSE",
            recipient = new { id = recipientIgsid.Trim() },
            message   = new { text = text.Trim() },
        };

        var url = $"{SendEndpoint(mode, ownerId)}?access_token={Uri.EscapeDataString(accessToken)}";
        var req = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new InstagramException((int)res.StatusCode,
                ParseGraphError(raw) ?? $"Falha ao enviar DM ({(int)res.StatusCode}): {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        var messageId = "";
        if (root.TryGetProperty("message_id", out var midEl))
            messageId = midEl.GetString() ?? "";
        else if (root.TryGetProperty("id", out var idEl))
            messageId = idEl.GetString() ?? "";

        return new InstagramSendOutcome { MessageId = messageId, RawBody = raw };
    }

    /// <summary>
    /// Best-effort: tenta obter o nome do remetente IG. Não lança em erro.
    /// </summary>
    public async Task<string?> FetchProfileNameAsync(InstagramApiMode mode, string igsid, string accessToken)
    {
        try
        {
            var url = $"{ProfileEndpoint(mode, igsid)}?fields=name&access_token={Uri.EscapeDataString(accessToken)}";
            var res = await _http.GetAsync(url);
            if (!res.IsSuccessStatusCode) return null;

            var raw = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(raw);
            return doc.RootElement.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
        }
        catch (Exception ex)
        {
            _logger?.LogDebug(ex,
                "[IG-CLIENT] FetchProfileNameAsync falhou para igsid={Igsid}. Best-effort, ignorado.", igsid);
            return null;
        }
    }

    /// <summary>
    /// Fallback observável: tenta recuperar texto/sender de uma mensagem pelo mid.
    /// Esta NÃO é a fonte primária — é apenas diagnóstico, ativada explicitamente
    /// pela config Instagram:EnableMidFallbackLookup.
    /// </summary>
    public async Task<(string? text, string? senderId, DateTime? timestamp)>
        FetchMessageInfoByMidAsync(InstagramApiMode mode, string mid, string accessToken)
    {
        try
        {
            var url = $"{BaseFor(mode)}/{_graphVersion}/{Uri.EscapeDataString(mid)}" +
                      $"?fields={Uri.EscapeDataString("id,message,from,to,created_time")}" +
                      $"&access_token={Uri.EscapeDataString(accessToken)}";

            var res = await _http.GetAsync(url);
            var raw = await res.Content.ReadAsStringAsync();

            _logger?.LogInformation(
                "[IG-CLIENT] FALLBACK GET mid={Mid} mode={Mode} status={Status}.",
                mid, mode, (int)res.StatusCode);

            if (!res.IsSuccessStatusCode) return (null, null, null);

            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            var text = root.TryGetProperty("message", out var mEl) ? mEl.GetString() : null;
            string? senderId = null;
            if (root.TryGetProperty("from", out var fromEl) &&
                fromEl.ValueKind == JsonValueKind.Object &&
                fromEl.TryGetProperty("id", out var idEl))
                senderId = idEl.GetString();

            DateTime? ts = null;
            if (root.TryGetProperty("created_time", out var tsEl) &&
                DateTime.TryParse(tsEl.GetString(), out var parsed))
                ts = parsed.ToUniversalTime();

            return (text, senderId, ts);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "[IG-CLIENT] Fallback FetchMessageInfoByMidAsync exceção. Mid={Mid}.", mid);
            return (null, null, null);
        }
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    private static List<string> ExtractSubscribedFields(JsonElement root)
    {
        var active = new List<string>();
        if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var app in data.EnumerateArray())
            {
                if (app.TryGetProperty("subscribed_fields", out var sf) &&
                    sf.ValueKind == JsonValueKind.Array)
                {
                    foreach (var f in sf.EnumerateArray())
                    {
                        var v = f.GetString();
                        if (!string.IsNullOrWhiteSpace(v)) active.Add(v!);
                    }
                }
            }
        }
        return active;
    }

    private static string? ParseGraphError(string raw)
    {
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.TryGetProperty("error", out var err) &&
                err.TryGetProperty("message", out var msg))
            {
                var code = err.TryGetProperty("code", out var codeEl) ? codeEl.ToString() : null;
                return string.IsNullOrWhiteSpace(code) ? msg.GetString() : $"#{code}: {msg.GetString()}";
            }
        }
        catch { }
        return null;
    }

    /// <summary>
    /// Versão do URL sem o token, pra exibir no painel sem vazar credencial.
    /// </summary>
    private static string StripToken(string url)
    {
        var i = url.IndexOf("access_token=", StringComparison.OrdinalIgnoreCase);
        if (i < 0) return url;
        var prefix = url[..i].TrimEnd('&', '?');
        return prefix;
    }
}
