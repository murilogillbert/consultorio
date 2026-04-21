using System.Net.Http.Headers;
using System.Text.Json;
using Consultorio.Infra.Context;

namespace Consultorio.API.Services;

public class InstagramAccountInfo
{
    public string PageId       { get; init; } = "";
    public string PageName     { get; init; } = "";
    public string IgAccountId  { get; init; } = "";
    public string IgUsername   { get; init; } = "";
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

    public InstagramService(AppDbContext db, IConfiguration config, HttpClient http)
    {
        _db = db;
        _http = http;
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

        var token = SanitizeToken(clinic.IgAccessToken)!;
        var fields = Uri.EscapeDataString("id,name,instagram_business_account{id,username}");
        var url = $"/{_graphVersion}/{clinic.IgPageId}?fields={fields}&access_token={token}";

        var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new InstagramException((int)res.StatusCode, ParseGraphError(raw) ?? $"Erro ao conectar ao Instagram ({(int)res.StatusCode}).");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        var pageId   = root.TryGetProperty("id",   out var idEl)   ? idEl.GetString()   ?? "" : "";
        var pageName = root.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";

        var igId       = "";
        var igUsername = "";
        if (root.TryGetProperty("instagram_business_account", out var igEl))
        {
            igId       = igEl.TryGetProperty("id",       out var igIdEl)   ? igIdEl.GetString()   ?? "" : "";
            igUsername = igEl.TryGetProperty("username", out var igUserEl) ? igUserEl.GetString() ?? "" : "";
        }

        return new InstagramAccountInfo
        {
            PageId      = pageId,
            PageName    = pageName,
            IgAccountId = igId,
            IgUsername  = igUsername,
        };
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
