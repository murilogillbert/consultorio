using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Consultorio.API.Services;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/webhooks/gmail")]
[AllowAnonymous]
public class GmailWebhooksController : ControllerBase
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GmailWebhooksController> _logger;

    public GmailWebhooksController(
        IServiceScopeFactory scopeFactory,
        ILogger<GmailWebhooksController> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    [HttpPost]
    public IActionResult Receive(
        [FromQuery] Guid clinicId,
        [FromQuery] string? token,
        [FromBody] GmailPubSubPushEnvelope? payload)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<GmailPubSubService>();
                await service.ProcessPushNotificationAsync(clinicId, token, payload);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao processar webhook Pub/Sub do Gmail para a clinica {ClinicId}", clinicId);
            }
        });

        return Ok(new { ok = true });
    }
}
