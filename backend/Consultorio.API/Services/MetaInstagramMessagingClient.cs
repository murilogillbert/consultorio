using System.Text;
using System.Text.Json;
using Consultorio.Domain.Models;

namespace Consultorio.API.Services;

public enum MetaInstagramMessagingMode
{
    InstagramLogin,
    FacebookPageLogin,
}

public sealed class MetaInstagramEndpointInfo
{
    public string Mode { get; init; } = "";
    public string GraphVersion { get; init; } = "";
    public string SendEndpoint { get; init; } = "";
    public string SubscribeEndpoint { get; init; } = "";
    public string SubscribedAppsEndpoint { get; init; } = "";
    public string UserProfileEndpoint { get; init; } = "";
    public bool AllowMessageEditMidFallback { get; init; }
}

public sealed class MetaInstagramSubscriptionResult
{
    public bool Ok { get; init; }
    public string Detail { get; init; } = "";
    public List<string> SubscribedFields { get; init; } = new();
    public string SubscribeEndpoint { get; init; } = "";
    public string SubscribedAppsEndpoint { get; init; } = "";
}

public sealed class MetaInstagramMessagingClient
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<MetaInstagramMessagingClient> _logger;

    public MetaInstagramMessagingClient(
        HttpClient http,
        IConfiguration config,
        ILogger<MetaInstagramMessagingClient> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public string GraphVersion => _config["Instagram:GraphVersion"] ?? "v23.0";

    public string FacebookGraphBaseUrl =>
        (_config["Instagram:FacebookGraphBaseUrl"] ??
         _config["Instagram:GraphBaseUrl"] ??
         "https://graph.facebook.com").TrimEnd('/');

    public string InstagramGraphBaseUrl =>
        (_config["Instagram:InstagramGraphBaseUrl"] ??
         "https://graph.instagram.com").TrimEnd('/');

    public MetaInstagramMessagingMode Mode
    {
        get
        {
            var configured = _config["Instagram:Mode"];
            return string.Equals(configured, "FacebookPageLogin", StringComparison.OrdinalIgnoreCase)
                ? MetaInstagramMessagingMode.FacebookPageLogin
                : MetaInstagramMessagingMode.InstagramLogin;
        }
    }

    public bool AllowMessageEditMidFallback =>
        bool.TryParse(_config["Instagram:AllowMessageEditMidFallback"], out var value) && value;

    public MetaInstagramEndpointInfo GetEndpointInfo(Clinic? clinic = null)
    {
        var ownerId = Mode == MetaInstagramMessagingMode.InstagramLogin
            ? FirstNonEmpty(clinic?.IgAccountId, "{ig_user_id}")
            : FirstNonEmpty(clinic?.IgPageId, "{page_id}");

        var baseUrl = Mode == MetaInstagramMessagingMode.InstagramLogin
            ? InstagramGraphBaseUrl
            : FacebookGraphBaseUrl;

        return new MetaInstagramEndpointInfo
        {
            Mode = Mode.ToString(),
            GraphVersion = GraphVersion,
            SendEndpoint = $"{baseUrl}/{GraphVersion}/{ownerId}/messages",
            SubscribeEndpoint = $"{baseUrl}/{GraphVersion}/{ownerId}/subscribed_apps",
            SubscribedAppsEndpoint = $"{baseUrl}/{GraphVersion}/{ownerId}/subscribed_apps",
            UserProfileEndpoint = $"{InstagramGraphBaseUrl}/{GraphVersion}/{{ig_scoped_id}}",
            AllowMessageEditMidFallback = AllowMessageEditMidFallback,
        };
    }

    public async Task<InstagramAccountInfo> TestConnectionAsync(Clinic clinic)
    {
        var token = SanitizeToken(clinic.IgAccessToken);
        if (string.IsNullOrWhiteSpace(token))
            throw new InstagramException(422, "Access Token do Instagram nao configurado.");

        if (Mode == MetaInstagramMessagingMode.InstagramLogin)
        {
            InstagramException? instagramError = null;

            if (!string.IsNullOrWhiteSpace(clinic.IgAccountId))
            {
                try
                {
                    var igInfo = await FetchInstagramUserInfoAsync(clinic.IgAccountId, token);
                    return new InstagramAccountInfo
                    {
                        PageId = clinic.IgPageId ?? "",
                        PageName = "",
                        IgAccountId = igInfo.id,
                        IgUsername = igInfo.username,
                    };
                }
                catch (InstagramException ex)
                {
                    instagramError = ex;
                    _logger.LogWarning(
                        "[IG-CLIENT] InstagramLogin test failed for IgAccountId={IgAccountId}. Trying Facebook Page discovery when possible. Status={Status} Error={Error}",
                        clinic.IgAccountId,
                        ex.StatusCode,
                        ex.Message);
                }
            }

            if (!string.IsNullOrWhiteSpace(clinic.IgPageId))
            {
                try
                {
                    return await FetchLinkedInstagramAccountFromPageAsync(clinic.IgPageId, token);
                }
                catch (InstagramException ex)
                {
                    if (instagramError != null)
                        throw instagramError;

                    throw new InstagramException(
                        ex.StatusCode,
                        "Modo InstagramLogin ativo. Informe o Instagram Professional Account ID e um Instagram User/System User Access Token com instagram_business_manage_messages. " +
                        $"Falha ao consultar Page ID como fallback: {ex.Message}");
                }
            }

            throw instagramError ?? new InstagramException(
                422,
                "Modo InstagramLogin ativo. Configure o Instagram Professional Account ID para testar a conexao.");
        }

        if (string.IsNullOrWhiteSpace(clinic.IgPageId))
            throw new InstagramException(422, "Page ID do Instagram nao configurado.");

        return await FetchLinkedInstagramAccountFromPageAsync(clinic.IgPageId, token);
    }

    public async Task<MetaInstagramSubscriptionResult> SubscribeAsync(Clinic clinic)
    {
        var token = SanitizeToken(clinic.IgAccessToken);
        if (string.IsNullOrWhiteSpace(token))
            return new MetaInstagramSubscriptionResult
            {
                Ok = false,
                Detail = "Access Token invalido apos sanitizacao.",
            };

        return Mode == MetaInstagramMessagingMode.InstagramLogin
            ? await SubscribeInstagramAccountAsync(clinic, token)
            : await SubscribeFacebookPageAsync(clinic, token);
    }

    public async Task<InstagramSendResult> SendTextMessageAsync(Clinic clinic, string igUserId, string message)
    {
        var token = SanitizeToken(clinic.IgAccessToken);
        if (string.IsNullOrWhiteSpace(token))
            throw new InstagramException(422, "Access Token do Instagram nao configurado.");

        if (string.IsNullOrWhiteSpace(igUserId))
            throw new InstagramException(422, "Paciente sem ID do Instagram para resposta.");

        if (string.IsNullOrWhiteSpace(message))
            throw new InstagramException(422, "Mensagem nao pode estar vazia.");

        var ownerId = Mode == MetaInstagramMessagingMode.InstagramLogin
            ? clinic.IgAccountId
            : clinic.IgPageId;

        if (string.IsNullOrWhiteSpace(ownerId))
        {
            var required = Mode == MetaInstagramMessagingMode.InstagramLogin
                ? "Instagram Professional Account ID"
                : "Facebook Page ID";
            throw new InstagramException(422, $"{required} nao configurado.");
        }

        object body = Mode == MetaInstagramMessagingMode.InstagramLogin
            ? new
            {
                recipient = new { id = igUserId.Trim() },
                message = new { text = message.Trim() },
            }
            : new
            {
                messaging_type = "RESPONSE",
                recipient = new { id = igUserId.Trim() },
                message = new { text = message.Trim() },
            };

        var baseUrl = Mode == MetaInstagramMessagingMode.InstagramLogin
            ? InstagramGraphBaseUrl
            : FacebookGraphBaseUrl;

        var url = $"{baseUrl}/{GraphVersion}/{Uri.EscapeDataString(ownerId)}/messages?access_token={Uri.EscapeDataString(token)}";
        var req = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new InstagramException((int)res.StatusCode, ParseGraphError(raw) ?? $"Instagram send error {(int)res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        var messageId = "";
        if (root.TryGetProperty("message_id", out var messageIdEl))
            messageId = messageIdEl.GetString() ?? "";
        else if (root.TryGetProperty("id", out var idEl))
            messageId = idEl.GetString() ?? "";

        return new InstagramSendResult { MessageId = messageId, Status = "sent" };
    }

    public async Task<string?> FetchUserProfileNameAsync(string igScopedId, string? accessToken)
    {
        var token = SanitizeToken(accessToken);
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(igScopedId))
            return null;

        var fields = Uri.EscapeDataString("name,username");
        var url = $"{InstagramGraphBaseUrl}/{GraphVersion}/{Uri.EscapeDataString(igScopedId)}?fields={fields}&access_token={Uri.EscapeDataString(token)}";

        try
        {
            var res = await _http.GetAsync(url);
            var raw = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogInformation(
                    "[IG-CLIENT] User profile lookup failed via graph.instagram.com. IGSID={Igsid} Status={Status} Error={Error}",
                    igScopedId,
                    (int)res.StatusCode,
                    ParseGraphError(raw));
                return null;
            }

            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            var name = root.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
            var username = root.TryGetProperty("username", out var usernameEl) ? usernameEl.GetString() : null;
            return FirstNonEmpty(name, username);
        }
        catch (Exception ex)
        {
            _logger.LogInformation(ex, "[IG-CLIENT] User profile lookup exception. IGSID={Igsid}", igScopedId);
            return null;
        }
    }

    private async Task<MetaInstagramSubscriptionResult> SubscribeInstagramAccountAsync(Clinic clinic, string token)
    {
        if (string.IsNullOrWhiteSpace(clinic.IgAccountId))
        {
            return new MetaInstagramSubscriptionResult
            {
                Ok = false,
                Detail = "Modo InstagramLogin ativo, mas IgAccountId nao esta configurado.",
            };
        }

        var fields = new[] { "messages", "messaging_postbacks", "messaging_seen", "message_reactions" };
        var endpoint = $"{InstagramGraphBaseUrl}/{GraphVersion}/{Uri.EscapeDataString(clinic.IgAccountId)}/subscribed_apps";
        return await SubscribeAndReadBackAsync(endpoint, fields, token, "instagram-account", clinic.IgAccountId);
    }

    private async Task<MetaInstagramSubscriptionResult> SubscribeFacebookPageAsync(Clinic clinic, string storedToken)
    {
        if (string.IsNullOrWhiteSpace(clinic.IgPageId))
        {
            return new MetaInstagramSubscriptionResult
            {
                Ok = false,
                Detail = "Modo FacebookPageLogin ativo, mas IgPageId nao esta configurado.",
            };
        }

        var pageToken = await FetchPageAccessTokenAsync(clinic.IgPageId, storedToken);
        var tokenForSubscribe = pageToken ?? storedToken;
        if (string.IsNullOrWhiteSpace(pageToken))
        {
            _logger.LogWarning(
                "[IG-CLIENT] Could not derive Page Access Token via GET /{PageId}?fields=access_token. Trying stored token.",
                clinic.IgPageId);
        }

        var fields = new[] { "messages", "messaging_postbacks", "message_reactions", "message_reads" };
        var endpoint = $"{FacebookGraphBaseUrl}/{GraphVersion}/{Uri.EscapeDataString(clinic.IgPageId)}/subscribed_apps";
        var result = await SubscribeAndReadBackAsync(endpoint, fields, tokenForSubscribe, "page", clinic.IgPageId);

        if (!result.Ok && result.Detail.Contains("#210", StringComparison.OrdinalIgnoreCase))
        {
            result = result.WithDetail(
                result.Detail +
                " O token salvo nao parece ser Page Access Token. Verifique pages_show_list, pages_manage_metadata, pages_messaging e instagram_manage_messages.");
        }

        return result;
    }

    private async Task<MetaInstagramSubscriptionResult> SubscribeAndReadBackAsync(
        string endpoint,
        IReadOnlyCollection<string> fields,
        string accessToken,
        string ownerKind,
        string ownerId)
    {
        var fieldsParam = Uri.EscapeDataString(string.Join(",", fields));
        var subscribeUrl = $"{endpoint}?subscribed_fields={fieldsParam}&access_token={Uri.EscapeDataString(accessToken)}";

        var subscribeRes = await _http.PostAsync(subscribeUrl, content: null);
        var subscribeRaw = await subscribeRes.Content.ReadAsStringAsync();

        _logger.LogInformation(
            "[IG-CLIENT] POST subscribed_apps OwnerKind={OwnerKind} OwnerId={OwnerId} Status={Status} Body={Body}",
            ownerKind,
            ownerId,
            (int)subscribeRes.StatusCode,
            subscribeRaw);

        if (!subscribeRes.IsSuccessStatusCode)
        {
            return new MetaInstagramSubscriptionResult
            {
                Ok = false,
                Detail = ParseGraphError(subscribeRaw) ?? $"HTTP {(int)subscribeRes.StatusCode}",
                SubscribeEndpoint = endpoint,
                SubscribedAppsEndpoint = endpoint,
            };
        }

        var readUrl = $"{endpoint}?access_token={Uri.EscapeDataString(accessToken)}";
        var readRes = await _http.GetAsync(readUrl);
        var readRaw = await readRes.Content.ReadAsStringAsync();

        _logger.LogInformation(
            "[IG-CLIENT] GET subscribed_apps OwnerKind={OwnerKind} OwnerId={OwnerId} Status={Status} Body={Body}",
            ownerKind,
            ownerId,
            (int)readRes.StatusCode,
            readRaw);

        var active = readRes.IsSuccessStatusCode ? ExtractSubscribedFields(readRaw) : new List<string>();
        var hasMessages = active.Any(f => string.Equals(f, "messages", StringComparison.OrdinalIgnoreCase));
        var detail = active.Count == 0
            ? "Conta subscrita, mas a Meta nao retornou campos ativos no read-back."
            : $"Campos ativos: {string.Join(", ", active)}.";

        if (!readRes.IsSuccessStatusCode)
            detail += $" Read-back falhou: {ParseGraphError(readRaw) ?? $"HTTP {(int)readRes.StatusCode}"}";

        return new MetaInstagramSubscriptionResult
        {
            Ok = hasMessages,
            Detail = detail,
            SubscribedFields = active,
            SubscribeEndpoint = endpoint,
            SubscribedAppsEndpoint = endpoint,
        };
    }

    private async Task<InstagramAccountInfo> FetchLinkedInstagramAccountFromPageAsync(string pageId, string token)
    {
        var fields = Uri.EscapeDataString("id,name,instagram_business_account{id,username}");
        var url = $"{FacebookGraphBaseUrl}/{GraphVersion}/{Uri.EscapeDataString(pageId)}?fields={fields}&access_token={Uri.EscapeDataString(token)}";

        var res = await _http.GetAsync(url);
        var raw = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new InstagramException((int)res.StatusCode, ParseGraphError(raw) ?? $"Erro ao conectar ao Instagram ({(int)res.StatusCode}).");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        if (!root.TryGetProperty("instagram_business_account", out var igEl) ||
            igEl.ValueKind != JsonValueKind.Object)
        {
            throw new InstagramException(422, "A Pagina do Facebook informada nao tem uma conta Instagram Business vinculada.");
        }

        var igId = igEl.TryGetProperty("id", out var igIdEl) ? igIdEl.GetString() ?? "" : "";
        if (string.IsNullOrWhiteSpace(igId))
            throw new InstagramException(422, "A API da Meta nao retornou o ID da conta Instagram Business.");

        return new InstagramAccountInfo
        {
            PageId = root.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "",
            PageName = root.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "",
            IgAccountId = igId,
            IgUsername = igEl.TryGetProperty("username", out var userEl) ? userEl.GetString() ?? "" : "",
        };
    }

    private async Task<(string id, string username)> FetchInstagramUserInfoAsync(string igUserId, string token)
    {
        var fields = Uri.EscapeDataString("id,username");
        var url = $"{InstagramGraphBaseUrl}/{GraphVersion}/{Uri.EscapeDataString(igUserId)}?fields={fields}&access_token={Uri.EscapeDataString(token)}";

        var res = await _http.GetAsync(url);
        var raw = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new InstagramException((int)res.StatusCode, ParseGraphError(raw) ?? $"Erro ao conectar ao Instagram ({(int)res.StatusCode}).");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        var id = root.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
        var username = root.TryGetProperty("username", out var usernameEl) ? usernameEl.GetString() ?? "" : "";
        if (string.IsNullOrWhiteSpace(id))
            throw new InstagramException(422, "A API da Meta nao retornou o Instagram Professional Account ID.");

        return (id, username);
    }

    private async Task<string?> FetchPageAccessTokenAsync(string pageId, string currentToken)
    {
        try
        {
            var url = $"{FacebookGraphBaseUrl}/{GraphVersion}/{Uri.EscapeDataString(pageId)}?fields=access_token&access_token={Uri.EscapeDataString(currentToken)}";
            var res = await _http.GetAsync(url);
            var raw = await res.Content.ReadAsStringAsync();

            _logger.LogInformation(
                "[IG-CLIENT] GET page access_token PageId={PageId} Status={Status} BodySize={Size}",
                pageId,
                (int)res.StatusCode,
                raw.Length);

            if (!res.IsSuccessStatusCode)
                return null;

            using var doc = JsonDocument.Parse(raw);
            return doc.RootElement.TryGetProperty("access_token", out var el)
                ? SanitizeToken(el.GetString())
                : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[IG-CLIENT] Exception while fetching Page Access Token. PageId={PageId}", pageId);
            return null;
        }
    }

    private static List<string> ExtractSubscribedFields(string raw)
    {
        var active = new List<string>();
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (!doc.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
                return active;

            foreach (var app in data.EnumerateArray())
            {
                if (!app.TryGetProperty("subscribed_fields", out var fields) ||
                    fields.ValueKind != JsonValueKind.Array)
                    continue;

                foreach (var field in fields.EnumerateArray())
                {
                    var value = field.GetString();
                    if (!string.IsNullOrWhiteSpace(value))
                        active.Add(value);
                }
            }
        }
        catch
        {
        }

        return active;
    }

    private static string? ParseGraphError(string raw)
    {
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.TryGetProperty("error", out var err))
            {
                var message = err.TryGetProperty("message", out var msgEl) ? msgEl.GetString() : null;
                var code = err.TryGetProperty("code", out var codeEl) ? codeEl.ToString() : null;
                return string.IsNullOrWhiteSpace(code) ? message : $"#{code}: {message}";
            }
        }
        catch
        {
        }

        return string.IsNullOrWhiteSpace(raw)
            ? null
            : raw.Length > 500 ? raw[..500] + "..." : raw;
    }

    private static string? SanitizeToken(string? raw) => InstagramService.SanitizeToken(raw);

    private static string FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? "";
}

internal static class MetaInstagramSubscriptionResultExtensions
{
    public static MetaInstagramSubscriptionResult WithDetail(this MetaInstagramSubscriptionResult result, string detail) => new()
    {
        Ok = result.Ok,
        Detail = detail,
        SubscribedFields = result.SubscribedFields,
        SubscribeEndpoint = result.SubscribeEndpoint,
        SubscribedAppsEndpoint = result.SubscribedAppsEndpoint,
    };
}
