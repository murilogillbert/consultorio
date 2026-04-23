using System.Text;
using System.Text.Json;
using Consultorio.Infra.Context;

namespace Consultorio.API.Services;

public class InstagramAccountInfo
{
    public string PageId       { get; init; } = "";
    public string PageName     { get; init; } = "";
    public string IgAccountId  { get; init; } = "";
    public string IgUsername   { get; init; } = "";

    // Preenchidos após tentativa de subscrição da página ao app.
    public bool?                SubscriptionSuccess { get; set; }
    public string?              SubscriptionDetail  { get; set; }
    public List<string>         SubscribedFields    { get; set; } = new();
}

public class InstagramSendResult
{
    public string MessageId { get; init; } = "";
    public string Status    { get; init; } = "";
}

public class InstagramException : Exception
{
    public int StatusCode { get; }

    public InstagramException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}

public class InstagramService
{
    private readonly AppDbContext _db;
    private readonly HttpClient _http;
    private readonly string _graphVersion;
    private readonly ILogger<InstagramService>? _logger;

    public InstagramService(AppDbContext db, IConfiguration config, HttpClient http, ILogger<InstagramService>? logger = null)
    {
        _db = db;
        _http = http;
        _logger = logger;
        _http.BaseAddress = new Uri(config["Instagram:GraphBaseUrl"] ?? "https://graph.facebook.com");
        _graphVersion = config["Instagram:GraphVersion"] ?? "v23.0";
    }

    public static string? SanitizeToken(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var clean = new string(raw.TrimStart('\uFEFF').Trim()
            .Where(c => c >= 0x20 && c <= 0x7E)
            .ToArray());
        return clean == "" ? null : clean;
    }

    private void EnsureConfigured(string? accessToken, string? pageId)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
            throw new InstagramException(422, "Access Token do Instagram não configurado.");
        if (string.IsNullOrWhiteSpace(pageId))
            throw new InstagramException(422, "Page ID do Instagram não configurado.");
    }

    public async Task<InstagramAccountInfo> TestConnectionAsync(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId)
            ?? throw new InstagramException(404, "Clínica não encontrada.");

        EnsureConfigured(clinic.IgAccessToken, clinic.IgPageId);

        var token = SanitizeToken(clinic.IgAccessToken);
        if (string.IsNullOrWhiteSpace(token))
            throw new InstagramException(422,
                "Access Token do Instagram contém apenas caracteres inválidos após sanitização. Reconfigure a credencial.");

        // Graph API accepts access_token as a query parameter. Keeping it in the URL
        // avoids edge cases where middleware strips Authorization headers.
        var fields = Uri.EscapeDataString("id,name,instagram_business_account{id,username}");
        var url = $"/{_graphVersion}/{clinic.IgPageId}?fields={fields}&access_token={Uri.EscapeDataString(token)}";

        var req = new HttpRequestMessage(HttpMethod.Get, url);

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new InstagramException((int)res.StatusCode, ParseGraphError(raw) ?? $"Erro ao conectar ao Instagram ({(int)res.StatusCode}).");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        var pageId   = root.TryGetProperty("id",   out var idEl)   ? idEl.GetString()   ?? "" : "";
        var pageName = root.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";

        // Explicitly reject pages without a linked Instagram Business account.
        // Without this, we'd return 200 OK with an empty label, which looks like success
        // but leaves the integration unusable for DMs.
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
        {
            throw new InstagramException(422,
                "A API do Meta não retornou o ID da conta Instagram Business. " +
                "Verifique se o Page Access Token tem as permissões instagram_basic e instagram_manage_messages.");
        }

        return new InstagramAccountInfo
        {
            PageId      = pageId,
            PageName    = pageName,
            IgAccountId = igId,
            IgUsername  = igUsername,
        };
    }

    /// <summary>
    /// Subscribe the Facebook Page to the app for the given fields. Sem isso a Meta NÃO
    /// envia mensagens pro webhook, mesmo com a URL validada no painel.
    /// Retorna (success, detalhe_legivel_pro_usuario). Não lança exceção — queremos
    /// reportar o resultado pro front mesmo se falhar.
    /// </summary>
    public async Task<(bool ok, string detail, List<string> subscribedFields)> SubscribePageToAppAsync(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId)
            ?? throw new InstagramException(404, "Clínica não encontrada.");

        EnsureConfigured(clinic.IgAccessToken, clinic.IgPageId);

        var storedToken = SanitizeToken(clinic.IgAccessToken);
        if (string.IsNullOrWhiteSpace(storedToken))
            return (false, "Access Token inválido após sanitização.", new List<string>());

        // ── Passo 1: obter um Page Access Token ────────────────────────────────
        // /subscribed_apps exige (#210) um token DA página, não user/system token.
        // Se o stored token já é um Page Token, essa chamada também retorna um
        // access_token (o próprio, ou um derivado válido). Se for User Token
        // com pages_* permissions, retorna o Page Token correspondente.
        var pageToken = await FetchPageAccessTokenAsync(clinic.IgPageId!, storedToken);
        var usingDerivedToken = !string.IsNullOrWhiteSpace(pageToken) && pageToken != storedToken;
        var tokenForSubscribe = pageToken ?? storedToken;

        if (string.IsNullOrWhiteSpace(pageToken))
        {
            _logger?.LogWarning(
                "[IG-SUBSCRIBE] Não foi possível derivar Page Access Token via GET /{PageId}?fields=access_token. Tentando com o token armazenado mesmo assim (provavelmente vai falhar com erro #210).",
                clinic.IgPageId);
        }
        else
        {
            _logger?.LogInformation(
                "[IG-SUBSCRIBE] Page Access Token {Action} via GET /{PageId}?fields=access_token.",
                usingDerivedToken ? "derivado do token armazenado" : "idêntico ao armazenado (já era Page Token)",
                clinic.IgPageId);
        }

        // Campos suportados para Instagram Messaging via Page → subscribed_apps.
        // IMPORTANTE: são `message_reactions` e `message_reads` (sem o "-ing")
        // — a lista válida do Graph API usa prefixo `message_*`, não `messaging_*`.
        // `messages` é o essencial; os demais habilitam leitura/reação/postback.
        var fields = new[] { "messages", "messaging_postbacks", "message_reactions", "message_reads" };
        var fieldsParam = Uri.EscapeDataString(string.Join(",", fields));

        // POST /{PAGE_ID}/subscribed_apps?subscribed_fields=messages,...&access_token=...
        var subscribeUrl = $"/{_graphVersion}/{clinic.IgPageId}/subscribed_apps?subscribed_fields={fieldsParam}&access_token={Uri.EscapeDataString(tokenForSubscribe)}";
        var subscribeReq = new HttpRequestMessage(HttpMethod.Post, subscribeUrl);

        try
        {
            var subscribeRes = await _http.SendAsync(subscribeReq);
            var subscribeRaw = await subscribeRes.Content.ReadAsStringAsync();

            _logger?.LogInformation(
                "[IG-SUBSCRIBE] POST {PageId}/subscribed_apps → {Status}. Body: {Body}",
                clinic.IgPageId, (int)subscribeRes.StatusCode, subscribeRaw);

            if (!subscribeRes.IsSuccessStatusCode)
            {
                var err = ParseGraphError(subscribeRaw) ?? $"Erro {(int)subscribeRes.StatusCode} ao subscrever página.";
                // Se o erro é #210 e não usamos token derivado, damos uma instrução acionável.
                if (err.Contains("#210") || err.Contains("page access token", StringComparison.OrdinalIgnoreCase))
                {
                    err += " → O token salvo não é um Page Access Token. Verifique no Graph API Explorer que ele tem as permissões " +
                           "`pages_show_list`, `pages_manage_metadata`, `pages_messaging` e `instagram_manage_messages`, " +
                           "e que foi gerado a partir de um usuário com admin role na Página.";
                }
                return (false, err, new List<string>());
            }

            // Busca estado atual da subscrição pra confirmar quais campos ficaram ativos.
            var listUrl = $"/{_graphVersion}/{clinic.IgPageId}/subscribed_apps?access_token={Uri.EscapeDataString(tokenForSubscribe)}";
            var listReq = new HttpRequestMessage(HttpMethod.Get, listUrl);
            var listRes = await _http.SendAsync(listReq);
            var listRaw = await listRes.Content.ReadAsStringAsync();

            _logger?.LogInformation(
                "[IG-SUBSCRIBE] GET {PageId}/subscribed_apps → {Status}. Body: {Body}",
                clinic.IgPageId, (int)listRes.StatusCode, listRaw);

            var active = new List<string>();
            if (listRes.IsSuccessStatusCode)
            {
                try
                {
                    using var doc = JsonDocument.Parse(listRaw);
                    if (doc.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var app in data.EnumerateArray())
                        {
                            if (app.TryGetProperty("subscribed_fields", out var sf) && sf.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var f in sf.EnumerateArray())
                                {
                                    var v = f.GetString();
                                    if (!string.IsNullOrWhiteSpace(v)) active.Add(v!);
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "[IG-SUBSCRIBE] Falha ao parsear resposta de subscribed_apps.");
                }
            }

            var detail = active.Count == 0
                ? "Página subscrita ao app, mas a Meta não retornou os campos ativos (verifique o painel manualmente)."
                : $"Página subscrita com sucesso. Campos ativos: {string.Join(", ", active)}.";

            if (usingDerivedToken)
                detail += " (Page Access Token derivado automaticamente do token salvo.)";

            // ── Passo 3: subscrever a Conta Instagram Business diretamente ─────────
            // POST /{PAGE_ID}/subscribed_apps cobre webhooks object=page (Messenger).
            // Para webhooks object=instagram (Instagram Graph API, formato changes[]),
            // a Meta exige TAMBÉM POST /{IG_ACCOUNT_ID}/subscribed_apps com o mesmo
            // Page Access Token. Sem isso, DMs reais não chegam ao webhook.
            var igAccountId = clinic.IgAccountId; // populado pelo TestConnectionAsync
            if (!string.IsNullOrWhiteSpace(igAccountId))
            {
                // Campos válidos para /{ig-user-id}/subscribed_apps.
                // Nota: neste endpoint os prefixos são messaging_* (diferente do Page).
                var igFields    = new[] { "messages", "messaging_postbacks", "messaging_seen", "messaging_reactions" };
                var igFieldsEnc = Uri.EscapeDataString(string.Join(",", igFields));
                var igSubUrl    = $"/{_graphVersion}/{igAccountId}/subscribed_apps?subscribed_fields={igFieldsEnc}&access_token={Uri.EscapeDataString(tokenForSubscribe)}";

                try
                {
                    var igRes = await _http.SendAsync(new HttpRequestMessage(HttpMethod.Post, igSubUrl));
                    var igRaw = await igRes.Content.ReadAsStringAsync();

                    _logger?.LogInformation(
                        "[IG-SUBSCRIBE] POST {IgAccountId}/subscribed_apps → {Status}. Body: {Body}",
                        igAccountId, (int)igRes.StatusCode, igRaw);

                    if (igRes.IsSuccessStatusCode)
                    {
                        detail += $" ✓ Conta Instagram Business ({igAccountId}) subscrita ao app (object=instagram webhooks habilitados).";
                        _logger?.LogInformation(
                            "[IG-SUBSCRIBE] Conta Instagram Business {IgAccountId} subscrita com sucesso.",
                            igAccountId);
                    }
                    else
                    {
                        var igErr = ParseGraphError(igRaw) ?? $"HTTP {(int)igRes.StatusCode}";
                        detail += $" ⚠ Falha ao subscrever conta IG diretamente ({igAccountId}): {igErr}. DMs via object=instagram podem não chegar.";
                        _logger?.LogWarning(
                            "[IG-SUBSCRIBE] Falha ao subscrever conta IG {IgAccountId}: {Error}",
                            igAccountId, igErr);
                    }
                }
                catch (Exception igEx)
                {
                    detail += $" ⚠ Exceção ao subscrever conta IG ({igAccountId}): {igEx.Message}.";
                    _logger?.LogWarning(igEx,
                        "[IG-SUBSCRIBE] Exceção ao subscrever conta IG {IgAccountId}.",
                        igAccountId);
                }
            }
            else
            {
                _logger?.LogWarning(
                    "[IG-SUBSCRIBE] IgAccountId não disponível — pulando subscrição direta da conta Instagram. " +
                    "Execute 'Testar conexão' para que o sistema salve o ID automaticamente.");
                detail += " ⚠ IgAccountId ainda não salvo — clique 'Testar conexão' novamente após este save para habilitar a subscrição object=instagram.";
            }

            return (true, detail, active);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[IG-SUBSCRIBE] Exceção ao subscrever página {PageId}.", clinic.IgPageId);
            return (false, $"Exceção ao subscrever página: {ex.Message}", new List<string>());
        }
    }

    /// <summary>
    /// Dado um User/System User Token com permissões em páginas, retorna o
    /// Page Access Token correspondente. Se o input já for um Page Token,
    /// a Meta devolve o próprio token no campo `access_token`.
    /// Retorna null em qualquer falha (token sem permissão, rede, etc).
    /// </summary>
    private async Task<string?> FetchPageAccessTokenAsync(string pageId, string currentToken)
    {
        try
        {
            var url = $"/{_graphVersion}/{pageId}?fields=access_token&access_token={Uri.EscapeDataString(currentToken)}";
            var res = await _http.GetAsync(url);
            var raw = await res.Content.ReadAsStringAsync();

            _logger?.LogInformation(
                "[IG-SUBSCRIBE] GET {PageId}?fields=access_token → {Status}. Body size: {Size}.",
                pageId, (int)res.StatusCode, raw?.Length ?? 0);

            if (!res.IsSuccessStatusCode) return null;

            using var doc = JsonDocument.Parse(raw!);
            if (doc.RootElement.TryGetProperty("access_token", out var el))
            {
                var v = el.GetString();
                return string.IsNullOrWhiteSpace(v) ? null : SanitizeToken(v);
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "[IG-SUBSCRIBE] Exceção ao buscar Page Access Token para {PageId}.", pageId);
            return null;
        }
    }

    public async Task<InstagramSendResult> SendTextMessageAsync(Guid clinicId, string igUserId, string message)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId)
            ?? throw new InstagramException(404, "ClÃ­nica nÃ£o encontrada.");

        EnsureConfigured(clinic.IgAccessToken, clinic.IgPageId);

        var token = SanitizeToken(clinic.IgAccessToken);
        if (string.IsNullOrWhiteSpace(token))
            throw new InstagramException(422,
                "Access Token do Instagram contÃ©m apenas caracteres invÃ¡lidos apÃ³s sanitizaÃ§Ã£o. Reconfigure a credencial.");

        if (string.IsNullOrWhiteSpace(igUserId))
            throw new InstagramException(422, "Paciente sem ID do Instagram para resposta.");

        if (string.IsNullOrWhiteSpace(message))
            throw new InstagramException(422, "Mensagem nÃ£o pode estar vazia.");

        var body = new
        {
            messaging_type = "RESPONSE",
            recipient = new
            {
                id = igUserId.Trim(),
            },
            message = new
            {
                text = message.Trim(),
            },
        };

        // Graph API aceita access_token na query. Mantemos o padrÃ£o usado no teste
        // da integraÃ§Ã£o para evitar ambientes que filtram o header Authorization.
        var url = $"/{_graphVersion}/{clinic.IgPageId}/messages?access_token={Uri.EscapeDataString(token)}";
        var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new InstagramException((int)res.StatusCode, ParseGraphError(raw) ?? $"Instagram send error {res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        var messageId = "";
        if (root.TryGetProperty("message_id", out var messageIdEl))
            messageId = messageIdEl.GetString() ?? "";
        else if (root.TryGetProperty("id", out var idEl))
            messageId = idEl.GetString() ?? "";

        return new InstagramSendResult { MessageId = messageId, Status = "sent" };
    }

    private static string? ParseGraphError(string raw)
    {
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.TryGetProperty("error", out var err) &&
                err.TryGetProperty("message", out var msg))
                return msg.GetString();
        }
        catch { }
        return null;
    }
}
