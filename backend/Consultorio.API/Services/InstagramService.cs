using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Services;

public class InstagramAccountInfo
{
    public string PageId       { get; init; } = "";
    public string PageName     { get; init; } = "";
    public string IgAccountId  { get; init; } = "";
    public string IgUsername   { get; init; } = "";
    public InstagramApiMode Mode { get; init; }

    // Preenchidos após tentativa de subscrição.
    public bool?               SubscriptionSuccess { get; set; }
    public string?             SubscriptionDetail  { get; set; }
    public List<string>        SubscribedFields    { get; set; } = new();
    public string              SubscribeEndpoint   { get; set; } = "";
    public string              ConfirmEndpoint     { get; set; } = "";
    public string              SendEndpoint        { get; set; } = "";
    public string              OwnerId             { get; set; } = "";
}

public class InstagramSendResult
{
    public string MessageId { get; init; } = "";
    public string Status    { get; init; } = "";
    public string Endpoint  { get; init; } = "";
}

public class InstagramException : Exception
{
    public int StatusCode { get; }

    public InstagramException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}

/// <summary>
/// Camada fina que faz a ligação entre o banco/clínica e o
/// <see cref="MetaInstagramMessagingClient"/>. A lógica de qual URL usar
/// (graph.instagram.com vs graph.facebook.com) fica toda no client.
/// </summary>
public class InstagramService
{
    private readonly AppDbContext _db;
    private readonly MetaInstagramMessagingClient _client;
    private readonly ILogger<InstagramService>? _logger;

    public InstagramService(
        AppDbContext db,
        MetaInstagramMessagingClient client,
        ILogger<InstagramService>? logger = null)
    {
        _db      = db;
        _client  = client;
        _logger  = logger;
    }

    public InstagramApiMode Mode => _client.DefaultMode;
    public MetaInstagramMessagingClient Client => _client;

    public static string? SanitizeToken(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var clean = new string(raw.TrimStart('\uFEFF').Trim()
            .Where(c => c >= 0x20 && c <= 0x7E)
            .ToArray());
        return clean == "" ? null : clean;
    }

    private static string EnsureToken(string? raw)
    {
        var t = SanitizeToken(raw);
        if (string.IsNullOrWhiteSpace(t))
            throw new InstagramException(422,
                "Access Token do Instagram inválido após sanitização. Reconfigure a credencial.");
        return t!;
    }

    private string ResolveOwnerId(Clinic clinic) =>
        MetaInstagramMessagingClient.ResolveOwnerId(_client.DefaultMode, clinic.IgAccountId, clinic.IgPageId);

    public async Task<InstagramAccountInfo> TestConnectionAsync(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId)
            ?? throw new InstagramException(404, "Clínica não encontrada.");

        var token = EnsureToken(clinic.IgAccessToken);
        var ownerId = ResolveOwnerId(clinic);
        if (string.IsNullOrWhiteSpace(ownerId) && _client.DefaultMode == InstagramApiMode.FacebookPageLogin)
            throw new InstagramException(422,
                "Facebook Page ID não configurado.");

        var probe = await _client.ProbeAccountAsync(_client.DefaultMode, ownerId, token);
        var resolvedOwner = ResolveSendOwner(probe);

        return new InstagramAccountInfo
        {
            Mode         = probe.Mode,
            OwnerId      = resolvedOwner,
            PageId       = probe.PageId,
            PageName     = probe.PageName,
            IgAccountId  = probe.IgAccountId,
            IgUsername   = probe.IgUsername,
            SendEndpoint = _client.SendEndpoint(probe.Mode, resolvedOwner),
        };
    }

    /// <summary>
    /// Assina ao app o owner certo do modo:
    /// InstagramLogin → IG Business Account; FacebookPageLogin → Page (e tenta IG account também).
    /// </summary>
    public async Task<(bool ok, string detail, List<string> subscribedFields, string subscribeEndpoint, string confirmEndpoint, string ownerId)>
        SubscribePageToAppAsync(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId)
            ?? throw new InstagramException(404, "Clínica não encontrada.");

        var token = SanitizeToken(clinic.IgAccessToken);
        if (string.IsNullOrWhiteSpace(token))
            return (false, "Access Token inválido após sanitização.", new List<string>(), "", "", "");

        var ownerId = ResolveOwnerId(clinic);
        if (string.IsNullOrWhiteSpace(ownerId))
        {
            return (false,
                _client.DefaultMode == InstagramApiMode.InstagramLogin
                    ? "Instagram Business Account ID não configurado."
                    : "Facebook Page ID não configurado.",
                new List<string>(), "", "", "");
        }

        // Campos canônicos para webhooks de DMs no Instagram Direct.
        var fields = new[] { "messages", "messaging_postbacks", "message_reactions", "message_reads" };

        var outcome = await _client.SubscribeWebhooksAsync(_client.DefaultMode, ownerId, token!, fields);
        var detail  = outcome.Detail;

        if (!outcome.Ok)
        {
            var fallbackFields = new[] { "messages", "messaging_postbacks" };
            var fallbackOutcome = await _client.SubscribeWebhooksAsync(_client.DefaultMode, ownerId, token!, fallbackFields);

            if (!fallbackOutcome.Ok)
                fallbackOutcome = await _client.SubscribeWebhooksAsync(_client.DefaultMode, ownerId, token!, new[] { "messages" });

            if (fallbackOutcome.Ok)
            {
                outcome = fallbackOutcome;
                detail = $"Campos opcionais recusados pela Meta; subscricao refeita com campos essenciais. {fallbackOutcome.Detail}";
            }
        }

        if (outcome.Ok)
        {
            _logger?.LogInformation(
                "[IG-SUBSCRIBE] {OwnerId} (mode={Mode}) subscrito. Campos: {Fields}",
                ownerId, _client.DefaultMode, string.Join(",", outcome.SubscribedFields));
        }
        else
        {
            _logger?.LogWarning(
                "[IG-SUBSCRIBE] Falha ao subscrever {OwnerId} (mode={Mode}): {Detail}",
                ownerId, _client.DefaultMode, detail);
        }

        // No modo FacebookPageLogin (legado), a Meta historicamente exigia também
        // subscrever a conta IG diretamente para webhooks object=instagram. No
        // InstagramLogin a subscrição é feita uma única vez no IG Business Account.
        if (_client.DefaultMode == InstagramApiMode.FacebookPageLogin &&
            outcome.Ok &&
            !string.IsNullOrWhiteSpace(clinic.IgAccountId) &&
            !string.Equals(clinic.IgAccountId, ownerId, StringComparison.Ordinal))
        {
            var igFields = new[] { "messages", "messaging_postbacks", "messaging_seen", "message_reactions" };
            var igOutcome = await _client.SubscribeWebhooksAsync(InstagramApiMode.InstagramLogin, clinic.IgAccountId!, token!, igFields);
            detail += igOutcome.Ok
                ? $" ✓ Conta IG ({clinic.IgAccountId}) também subscrita (webhooks object=instagram)."
                : $" ⚠ Falha ao subscrever conta IG ({clinic.IgAccountId}): {igOutcome.Detail}";
        }

        return (outcome.Ok, detail, outcome.SubscribedFields, outcome.SubscribeUrl, outcome.ConfirmUrl, ownerId);
    }

    public async Task<InstagramSendResult> SendTextMessageAsync(Guid clinicId, string igUserId, string message)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId)
            ?? throw new InstagramException(404, "Clínica não encontrada.");

        var token = EnsureToken(clinic.IgAccessToken);
        var ownerId = ResolveOwnerId(clinic);
        if (string.IsNullOrWhiteSpace(ownerId))
            throw new InstagramException(422,
                _client.DefaultMode == InstagramApiMode.InstagramLogin
                    ? "Instagram Business Account ID não configurado."
                    : "Facebook Page ID não configurado.");

        var endpoint = _client.SendEndpoint(_client.DefaultMode, ownerId);
        var outcome = await _client.SendTextAsync(_client.DefaultMode, ownerId, token, igUserId, message);

        return new InstagramSendResult
        {
            MessageId = outcome.MessageId,
            Status    = "sent",
            Endpoint  = endpoint,
        };
    }

    public Task<string?> FetchProfileNameAsync(string igsid, string accessToken) =>
        _client.FetchProfileNameAsync(_client.DefaultMode, igsid, accessToken);

    public Task<(string? text, string? senderId, DateTime? timestamp)>
        FetchMessageInfoByMidFallbackAsync(string mid, string accessToken) =>
        _client.FetchMessageInfoByMidAsync(_client.DefaultMode, mid, accessToken);

    private string ResolveSendOwner(InstagramAccountProbeResult probe) => probe.Mode switch
    {
        InstagramApiMode.InstagramLogin    => string.IsNullOrWhiteSpace(probe.IgAccountId) ? probe.OwnerId : probe.IgAccountId,
        InstagramApiMode.FacebookPageLogin => string.IsNullOrWhiteSpace(probe.PageId)      ? probe.OwnerId : probe.PageId,
        _ => probe.OwnerId,
    };
}
