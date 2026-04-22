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

        var token = SanitizeToken(clinic.IgAccessToken);
        if (string.IsNullOrWhiteSpace(token))
            return (false, "Access Token inválido após sanitização.", new List<string>());

        // Campos suportados para Instagram Messaging via Page → subscribed_apps.
        // IMPORTANTE: são `message_reactions` e `message_reads` (sem o "-ing")
        // — a lista válida do Graph API usa prefixo `message_*`, não `messaging_*`.
        // `messages` é o essencial; os demais habilitam leitura/reação/postback.
        var fields = new[] { "messages", "messaging_postbacks", "message_reactions", "message_reads" };
        var fieldsParam = Uri.EscapeDataString(string.Join(",", fields));

        // POST /{PAGE_ID}/subscribed_apps?subscribed_fields=messages,...&access_token=...
        var subscribeUrl = $"/{_graphVersion}/{clinic.IgPageId}/subscribed_apps?subscribed_fields={fieldsParam}&access_token={Uri.EscapeDataString(token)}";
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
                return (false, err, new List<string>());
            }

            // Busca estado atual da subscrição pra confirmar quais campos ficaram ativos.
            var listUrl = $"/{_graphVersion}/{clinic.IgPageId}/subscribed_apps?access_token={Uri.EscapeDataString(token)}";
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

            return (true, detail, active);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[IG-SUBSCRIBE] Exceção ao subscrever página {PageId}.", clinic.IgPageId);
            return (false, $"Exceção ao subscrever página: {ex.Message}", new List<string>());
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
