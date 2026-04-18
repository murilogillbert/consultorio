using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

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
}

public class MpPaymentStatus
{
    public string ExternalId { get; init; } = null!;
    /// <summary>pending | approved | rejected | cancelled</summary>
    public string Status { get; init; } = null!;
}

public class MercadoPagoService
{
    private readonly HttpClient _http;
    private readonly string _accessToken;
    private static readonly JsonSerializerOptions _json = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public MercadoPagoService(IConfiguration config, HttpClient http)
    {
        _accessToken = config["MercadoPago:AccessToken"]!;
        _http = http;
        _http.BaseAddress = new Uri(config["MercadoPago:BaseUrl"] ?? "https://api.mercadopago.com");
    }

    // ── PIX ──────────────────────────────────────────────────────────────────
    public async Task<MpPixResult> CreatePixAsync(
        decimal amount, string description,
        string payerEmail, string? payerFirstName, string? payerLastName, string? payerCpf)
    {
        var body = new
        {
            transaction_amount = amount,
            description,
            payment_method_id = "pix",
            payer = new
            {
                email = string.IsNullOrWhiteSpace(payerEmail) ? "pagador@clinica.com.br" : payerEmail,
                first_name = payerFirstName ?? "Paciente",
                last_name = payerLastName ?? "Clínica",
                identification = string.IsNullOrWhiteSpace(payerCpf) ? null : new
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
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
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
            ExternalId = root.GetProperty("id").GetInt64().ToString(),
            Status = root.GetProperty("status").GetString()!,
            QrCode = txData.GetProperty("qr_code").GetString()!,
            QrCodeBase64 = txData.GetProperty("qr_code_base64").GetString()!,
        };
    }

    // ── Preference (link de checkout para cartão) ─────────────────────────────
    public async Task<MpPreferenceResult> CreatePreferenceAsync(
        decimal amount, string description, string payerEmail)
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
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new Exception($"Mercado Pago Preference error {res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        return new MpPreferenceResult
        {
            ExternalId = root.GetProperty("id").GetString()!,
            CheckoutUrl = root.GetProperty("init_point").GetString()!,
        };
    }

    // ── Consultar status ─────────────────────────────────────────────────────
    public async Task<MpPaymentStatus> GetPaymentStatusAsync(string externalId)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"/v1/payments/{externalId}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

        var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new Exception($"Mercado Pago status error {res.StatusCode}: {raw}");

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        return new MpPaymentStatus
        {
            ExternalId = externalId,
            Status = root.GetProperty("status").GetString()!,
        };
    }
}
