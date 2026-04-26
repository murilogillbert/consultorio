using Consultorio.Infra.Context;

namespace Consultorio.API.Services;

public class InstagramAccountInfo
{
    public string PageId { get; init; } = "";
    public string PageName { get; init; } = "";
    public string IgAccountId { get; init; } = "";
    public string IgUsername { get; init; } = "";

    public bool? SubscriptionSuccess { get; set; }
    public string? SubscriptionDetail { get; set; }
    public List<string> SubscribedFields { get; set; } = new();
}

public class InstagramSendResult
{
    public string MessageId { get; init; } = "";
    public string Status { get; init; } = "";
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
    private readonly MetaInstagramMessagingClient _metaClient;

    public InstagramService(AppDbContext db, MetaInstagramMessagingClient metaClient, HttpClient _)
    {
        _db = db;
        _metaClient = metaClient;
    }

    public static string? SanitizeToken(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var clean = new string(raw.TrimStart('\uFEFF').Trim()
            .Where(c => c >= 0x20 && c <= 0x7E)
            .ToArray());
        return clean == "" ? null : clean;
    }

    public MetaInstagramEndpointInfo GetEndpointInfo(Consultorio.Domain.Models.Clinic? clinic = null) =>
        _metaClient.GetEndpointInfo(clinic);

    public bool AllowMessageEditMidFallback => _metaClient.AllowMessageEditMidFallback;

    public async Task<InstagramAccountInfo> TestConnectionAsync(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId)
            ?? throw new InstagramException(404, "Clinica nao encontrada.");

        return await _metaClient.TestConnectionAsync(clinic);
    }

    public async Task<MetaInstagramSubscriptionResult> SubscribeToAppDetailedAsync(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId)
            ?? throw new InstagramException(404, "Clinica nao encontrada.");

        return await _metaClient.SubscribeAsync(clinic);
    }

    public async Task<(bool ok, string detail, List<string> subscribedFields)> SubscribePageToAppAsync(Guid clinicId)
    {
        var result = await SubscribeToAppDetailedAsync(clinicId);
        return (result.Ok, result.Detail, result.SubscribedFields);
    }

    public async Task<InstagramSendResult> SendTextMessageAsync(Guid clinicId, string igUserId, string message)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId)
            ?? throw new InstagramException(404, "Clinica nao encontrada.");

        return await _metaClient.SendTextMessageAsync(clinic, igUserId, message);
    }

    public Task<string?> FetchUserProfileNameAsync(string igScopedId, string? accessToken) =>
        _metaClient.FetchUserProfileNameAsync(igScopedId, accessToken);
}
