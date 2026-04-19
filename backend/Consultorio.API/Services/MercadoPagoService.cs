using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Consultorio.API.Services;

public class MpPixResult
{
    public string ExternalId { get; init; } = null!;
    public string Status { get; init; } = null!;
    public string QrCode { get; init; } = null!;
    public string QrCodeBase64 { get; init; } = null!;
}

public class MpPreferenceResult
{
    public string ExternalId { get; init; } = null!;
    public string CheckoutUrl { get; init; } = null!;
    public string SandboxUrl { get; init; } = null!;
}

public class MpPaymentStatus
{
    public string ExternalId { get; init; } = null!;
    public string Status { get; init; } = null!;
}

public class MpAccountInfo
{
    public string Email { get; init; } = null!;
    public string SiteId { get; init; } = null!;
}

public class MercadoPagoService
{
    private readonly HttpClient _http;
    private readonly string _fallbackToken;
    private readonly string _fallbackPublicKey;

    public string FallbackPublicKey => _fallbackPublicKey;

    private static readonly JsonSerializerOptions _json =
        new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public MercadoPagoService(IConfiguration config, HttpClient http)
    {
        _fallbackToken = config["MercadoPago:AccessToken"] ?? "";
        _fallbackPublicKey = config["MercadoPago:PublicKey"] ?? "";
        _http = http;
        _http.BaseAddress = new Uri(config["MercadoPago:BaseUrl"] ?? "https://api.mercadopago.com");
    }

    private string Resolve(string? overrideToken) =>
        !string.IsNullOrWhiteSpace(overrideToken) ? overrideToken : _fallbackToken;

    public async Task<MpPixResult> CreatePixAsync(
        decimal amount,
        string description,
        string payerEmail,
        string? payerFirstName,
        string? payerLastName,
        string? payerCpf,
        string? externalReference = null,
        string? accessToken = null)
    {
        var body = new
        {
            transaction_amount = amount,
            description,
            external_reference = externalReference,
            payment_method_id = "pix",
            payer = new
            {
                email = string.IsNullOrWhiteSpace(payerEmail) ? "pagador@clinica.com.br" : payerEmail,
                first_name = payerFirstName ?? "Paciente",
                last_name = payerLastName ?? "Clinica",
                identification = string.IsNullOrWhiteSpace(payerCpf)
                    ? null
                    : new
                    {
                        type = "CPF",
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

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;
        var txData = root.GetProperty("point_of_interaction").GetProperty("transaction_data");

        return new MpPixResult
        {
            ExternalId = root.GetProperty("id").GetInt64().ToString(CultureInfo.InvariantCulture),
            Status = root.GetProperty("status").GetString() ?? "pending",
            QrCode = txData.GetProperty("qr_code").GetString() ?? "",
            QrCodeBase64 = txData.GetProperty("qr_code_base64").GetString() ?? "",
        };
    }

    public async Task<MpPreferenceResult> CreatePreferenceAsync(
        decimal amount,
        string description,
        string payerEmail,
        string? externalReference = null,
        string? accessToken = null)
    {
        var body = new
        {
            items = new[]
            {
                new { title = description, quantity = 1, unit_price = amount, currency_id = "BRL" }
            },
            payer = new
            {
                email = string.IsNullOrWhiteSpace(payerEmail) ? "pagador@clinica.com.br" : payerEmail
            },
            external_reference = externalReference,
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
            ExternalId = root.GetProperty("id").GetString() ?? "",
            CheckoutUrl = root.TryGetProperty("init_point", out var initPoint) ? initPoint.GetString() ?? "" : "",
            SandboxUrl = root.TryGetProperty("sandbox_init_point", out var sandboxPoint) ? sandboxPoint.GetString() ?? "" : "",
        };
    }

    public async Task<MpPaymentStatus> GetPaymentStatusAsync(string externalId, string? accessToken = null)
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
            Status = root.GetProperty("status").GetString() ?? "pending",
        };
    }

    public async Task<MpPaymentStatus?> FindPaymentByExternalReferenceAsync(string externalReference, string? accessToken = null)
    {
        var req = new HttpRequestMessage(
            HttpMethod.Get,
            $"/v1/payments/search?sort=date_created&criteria=desc&external_reference={Uri.EscapeDataString(externalReference)}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Resolve(accessToken));

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new Exception($"Mercado Pago search error {res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        if (!doc.RootElement.TryGetProperty("results", out var results) || results.ValueKind != JsonValueKind.Array)
            return null;

        JsonElement? selected = null;
        foreach (var item in results.EnumerateArray())
        {
            if (selected == null)
                selected = item;

            if (item.TryGetProperty("status", out var statusEl) &&
                string.Equals(statusEl.GetString(), "approved", StringComparison.OrdinalIgnoreCase))
            {
                selected = item;
                break;
            }
        }

        if (selected == null)
            return null;

        var payment = selected.Value;
        if (!payment.TryGetProperty("id", out var idEl) || !payment.TryGetProperty("status", out var paymentStatusEl))
            return null;

        return new MpPaymentStatus
        {
            ExternalId = idEl.ValueKind == JsonValueKind.Number
                ? idEl.GetInt64().ToString(CultureInfo.InvariantCulture)
                : idEl.GetString() ?? idEl.GetRawText().Trim('"'),
            Status = paymentStatusEl.GetString() ?? "pending",
        };
    }

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
            Email = root.TryGetProperty("email", out var emailEl) ? emailEl.GetString() ?? "" : "",
            SiteId = root.TryGetProperty("site_id", out var siteEl) ? siteEl.GetString() ?? "" : "",
        };
    }
}
