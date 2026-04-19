using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.API.Services;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

/// <summary>
/// Receives IPN (Instant Payment Notification) webhooks from Mercado Pago.
/// MP docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
/// </summary>
[ApiController]
[Route("api/webhooks")]
[AllowAnonymous]                          // no JWT required — MP calls without auth token
[EnableCors("AllowWebhooks")]             // permit any origin (external server-to-server calls)
public class WebhooksController : ControllerBase
{
    private readonly AppDbContext       _db;
    private readonly MercadoPagoService _mp;

    // Map MP statuses → internal Payment statuses
    private static readonly Dictionary<string, string> StatusMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["approved"]     = "PAID",
        ["rejected"]     = "FAILED",
        ["cancelled"]    = "FAILED",
        ["refunded"]     = "REFUNDED",
        ["charged_back"] = "REFUNDED",
        ["pending"]      = "PENDING",
        ["in_process"]   = "PENDING",
        ["authorized"]   = "PENDING",
    };

    public WebhooksController(AppDbContext db, MercadoPagoService mp)
    {
        _db = db;
        _mp = mp;
    }

    // ─── GET /api/webhooks/mercadopago ────────────────────────────────────────
    // MP sends a GET with ?topic=payment&id=xxx to validate the URL during setup.
    // Just return 200 so the test passes.
    [HttpGet("mercadopago")]
    public IActionResult MercadoPagoValidate() => Ok("OK");

    // ─── POST /api/webhooks/mercadopago ───────────────────────────────────────
    [HttpPost("mercadopago")]
    public async Task<IActionResult> MercadoPago()
    {
        // Always respond 200 immediately — MP retries on non-200
        Response.Headers["Content-Type"] = "text/plain";
        await Response.WriteAsync("OK");
        await Response.Body.FlushAsync();

        try
        {
            using var reader = new System.IO.StreamReader(Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(bodyText);
            var root = doc.RootElement;

            // MP sends either type:"payment" (IPN) or action:"payment.*" (new webhooks)
            var type   = root.TryGetProperty("type",   out var t) ? t.GetString() : null;
            var action = root.TryGetProperty("action", out var a) ? a.GetString() : null;

            bool isPaymentEvent = type == "payment" ||
                                  (action != null && action.StartsWith("payment.", StringComparison.OrdinalIgnoreCase));
            if (!isPaymentEvent) return new EmptyResult();

            var gatewayId = root.TryGetProperty("data", out var dataEl) &&
                            dataEl.TryGetProperty("id",  out var idEl)
                ? idEl.GetRawText().Trim('"')
                : null;

            if (string.IsNullOrEmpty(gatewayId)) return new EmptyResult();

            // Find the matching Payment in our DB
            var payment = await _db.Payments
                .Include(p => p.Appointment)
                .FirstOrDefaultAsync(p => p.ExternalPaymentId == gatewayId);

            if (payment == null)
            {
                Console.WriteLine($"[MP Webhook] Payment not found for gatewayId {gatewayId}");
                return new EmptyResult();
            }

            // Validate X-Signature if the clinic has a webhook secret configured
            var clinic = await _db.Clinics.FindAsync(payment.Appointment.ClinicId);
            if (clinic?.MpWebhookSecret is { Length: > 0 } secret)
            {
                var xSig = Request.Headers["x-signature"].FirstOrDefault();
                var xReq = Request.Headers["x-request-id"].FirstOrDefault();
                if (xSig != null && !MercadoPagoService.ValidateWebhookSignature(xSig, xReq, gatewayId, secret))
                {
                    Console.WriteLine("[MP Webhook] Invalid signature — event ignored");
                    return new EmptyResult();
                }
            }

            // Fetch current status from MP
            var activeToken = clinic?.MpSandboxMode == false
                ? clinic.MpAccessTokenProd
                : clinic?.MpAccessTokenSandbox;

            var mpStatus = await _mp.GetPaymentStatusAsync(gatewayId, activeToken);
            var internalStatus = StatusMap.TryGetValue(mpStatus.Status, out var s) ? s : "PENDING";

            if (payment.Status != internalStatus)
            {
                payment.Status    = internalStatus;
                payment.UpdatedAt = DateTime.UtcNow;
                if (internalStatus == "PAID")
                    payment.PaymentDate = DateTime.UtcNow;

                await _db.SaveChangesAsync();
                Console.WriteLine($"[MP Webhook] Payment {payment.Id} → {internalStatus}");
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MP Webhook] Error: {ex.Message}");
        }

        return new EmptyResult();
    }
}
