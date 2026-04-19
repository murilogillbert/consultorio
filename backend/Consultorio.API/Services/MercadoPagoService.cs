using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Consultorio.API.Services;

// ─── Result types ────────────────────────────────────────────────────────────

public class MpPixResult
{
    public string ExternalId      { get; init; } = null!;
    public string Status          { get; init; } = null!;
    public string QrCode          { get; init; } = null!;
    public string QrCodeBase64    { get; init; } = null!;
}

public class MpPreferenceResult
{
    public string ExternalId      { get; init; } = null!;
    public string CheckoutUrl     { get; init; } = null!;
    public string SandboxUrl      { get; init; } = null!;
}

public class MpPaymentStatus
{
    public string ExternalId      { get; init; } = null!;
    /// <summary>pending | approved | rejected | cancelled</summary>
    public string Status          { get; init; } = null!;
}

public class MpAccountInfo
{
    public string Email           { get; init; } = null!;
    public string SiteId          { get; init; } = null!;
}

// ─── Service ─────────────────────────────────────────────────────────────────

public class MercadoPagoService
{
    private readonly HttpClient _http;
    private readonly string     _fallbackToken;
    private readonly string     _fallbackPublicKey;

    /// <summary>Public key from appsettings — used as fallback when the clinic has none.</summary>
    public string FallbackPublicKey => _fallbackPublicKey;

    private static readonly JsonSerializerOptions _json =
        new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public MercadoPagoService(IConfiguration config, HttpClient http)
    {
        _fallbackToken     = config["MercadoPago:AccessToken"] ?? "";
        _fallbackPublicKey = config["MercadoPago:PublicKey"]   ?? "";
        _http = http;
        _http.BaseAddress = new Uri(config["MercadoPago:BaseUrl"] ?? "https://api.mercadopago.com");
    }

    // Resolves the effective token: per-clinic override takes precedence over appsettings fallback.
    private string Resolve(string? overrideToken) =>
        !string.IsNullOrWhiteSpace(overrideToken) ? overrideToken : _fallbackToken;

    // ── PIX ──────────────────────────────────────────────────────────────────

    public async Task<MpPixResult> CreatePixAsync(
        decimal amount, string description,
        string payerEmail, string? payerFirstName, string? payerLastName, string? payerCpf,
        string? accessToken = null)
    {
        var body = new
        {
            transaction_amount = amount,
            description,
            payment_method_id = "pix",
            payer = new
            {
                email      = string.IsNullOrWhiteSpace(payerEmail) ? "pagador@clinica.com.br" : payerEmail,
                first_name = payerFirstName ?? "Paciente",
                last_name  = payerLastName  ?? "Clínica",
                identification = string.IsNullOrWhiteSpace(payerCpf) ? null : new
                {
                    type   = "CPF",
                    number = payerCpf.Replace(".", "").Replace("-", "")
                }
            }
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "/v1/payments")
        {
            Content = new StringContent(JsonSerializer.Serialize(body, _json), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Resolve(accessToken));
        req.Headers.Add("X-Idempotency-Key", Guid.NewGuid().ToString());

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new Exception($"Mercado Pago PIX error {res.StatusCode}: {raw}");

        using var doc  = JsonDocument.Parse(raw);
        var root       = doc.RootElement;
        var txData     = root.GetProperty("point_of_interaction").GetProperty("transaction_data");

        return new MpPixResult
        {
            ExternalId    = root.GetProperty("id").GetInt64().ToString(),
            Status        = root.GetProperty("status").GetString()!,
            QrCode        = txData.GetProperty("qr_code").GetString()!,
            QrCodeBase64  = txData.GetProperty("qr_code_base64").GetString()!,
        };
    }

    // ── Preference (link de checkout para cartão) ─────────────────────────────

    public async Task<MpPreferenceResult> CreatePreferenceAsync(
        decimal amount, string description, string payerEmail,
        string? accessToken = null)
    {
        var body = new
        {
            items = new[]
            {
                new { title = description, quantity = 1, unit_price = amount, currency_id = "BRL" }
            },
            payer = new { email = string.IsNullOrWhiteSpace(payerEmail) ? "pagador@clinica.com.br" : payerEmail },
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "/checkout/preferences")
        {
            Content = new StringContent(JsonSerializer.Serialize(body, _json), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Resolve(accessToken));

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new Exception($"Mercado Pago Preference error {res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        return new MpPreferenceResult
        {
            ExternalId   = root.GetProperty("id").GetString()!,
            CheckoutUrl  = root.TryGetProperty("init_point",         out var ip)  ? ip.GetString()! : "",
            SandboxUrl   = root.TryGetProperty("sandbox_init_point", out var sip) ? sip.GetString()! : "",
        };
    }

    // ── Consultar status ─────────────────────────────────────────────────────

    public async Task<MpPaymentStatus> GetPaymentStatusAsync(
        string externalId, string? accessToken = null)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"/v1/payments/{externalId}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Resolve(accessToken));

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new Exception($"Mercado Pago status error {res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        return new MpPaymentStatus
        {
            ExternalId = externalId,
            Status     = root.GetProperty("status").GetString()!,
        };
    }

    // ── Test connection (GET /v1/users/me) ───────────────────────────────────

    public async Task<MpAccountInfo> TestConnectionAsync(string? accessToken = null)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/v1/users/me");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Resolve(accessToken));

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new Exception($"Mercado Pago test error {res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        return new MpAccountInfo
        {
            Email  = root.TryGetProperty("email",   out var e) ? e.GetString() ?? "" : "",
            SiteId = root.TryGetProperty("site_id", out var s) ? s.GetString() ?? "" : "",
        };
    }

    // ── Validate IPN signature ───────────────────────────────────────────────
    // MP signs: "id:<paymentId>;request-id:<xRequestId>;ts:<timestamp>;"
    // Header: X-Signature: ts=<ts>,v1=<hmac>

    public static bool ValidateWebhookSignature(
        string xSignature, string? xRequestId, string paymentId, string secret)
    {
        try
        {
            // Parse "ts=...,v1=..."
            var parts = xSignature
                .Split(',')
                .Select(p => p.Split('=', 2))
                .Where(p => p.Length == 2)
                .ToDictionary(p => p[0].Trim(), p => p[1].Trim());

            if (!parts.TryGetValue("ts", out var ts) || !parts.TryGetValue("v1", out var v1))
                return false;

            var manifest = $"id:{paymentId};request-id:{xRequestId ?? ""};ts:{ts};";
            var expected = Convert.ToHexString(
                HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(manifest))
            ).ToLower();

            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected),
                Encoding.UTF8.GetBytes(v1.ToLower()));
        }
        catch
        {
            return false;
        }
    }
}
