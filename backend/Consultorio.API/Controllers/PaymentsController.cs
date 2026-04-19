using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.API.DTOs;
using Consultorio.API.Services;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MercadoPagoService _mp;

    private static readonly Dictionary<string, string> MercadoPagoStatusMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["approved"] = "PAID",
        ["rejected"] = "FAILED",
        ["cancelled"] = "FAILED",
        ["refunded"] = "REFUNDED",
        ["charged_back"] = "REFUNDED",
        ["pending"] = "PENDING",
        ["in_process"] = "PENDING",
        ["authorized"] = "PENDING",
    };

    public PaymentsController(AppDbContext db, MercadoPagoService mp)
    {
        _db = db;
        _mp = mp;
    }

    private Guid GetClinicId()
    {
        var claim = User.FindFirst("clinicId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty;
    }

    private async Task<string?> GetClinicMpTokenAsync(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId);
        if (clinic == null)
            return null;

        return clinic.MpSandboxMode
            ? clinic.MpAccessTokenSandbox
            : clinic.MpAccessTokenProd;
    }

    private static string FormatMoney(decimal amount) =>
        amount.ToString("C", CultureInfo.GetCultureInfo("pt-BR"));

    private static string GetMethodLabel(string? method) => method switch
    {
        "PIX" => "PIX",
        "CREDIT_CARD" => "cartao de credito",
        "DEBIT_CARD" => "cartao de debito",
        "CASH" => "dinheiro",
        "INSURANCE" => "convenio",
        _ => "outro metodo"
    };

    private static string GetPaymentReference(Payment payment) =>
        payment.Id.ToString("D");

    private static string MapMercadoPagoStatus(string gatewayStatus) =>
        MercadoPagoStatusMap.TryGetValue(gatewayStatus, out var internalStatus)
            ? internalStatus
            : "PENDING";

    private async Task<MpPaymentStatus?> ResolveMercadoPagoStatusAsync(Payment payment, string? accessToken)
    {
        if (!string.IsNullOrWhiteSpace(payment.ExternalPaymentId))
        {
            try
            {
                return await _mp.GetPaymentStatusAsync(payment.ExternalPaymentId, accessToken);
            }
            catch
            {
                // Checkout preference ids are not payment ids. Fall back to the
                // external reference we send when creating the charge.
            }
        }

        return await _mp.FindPaymentByExternalReferenceAsync(GetPaymentReference(payment), accessToken);
    }

    private static string BuildChargeMessage(Appointment appt, Payment payment, string method)
    {
        var patientName = appt.Patient?.User?.Name ?? "Paciente";
        var serviceName = appt.Service?.Name ?? "Consulta";
        var amount = FormatMoney(payment.Amount);
        var methodLabel = GetMethodLabel(method);

        var lines = new List<string>
        {
            $"Ola, {patientName}!",
            $"Registramos uma cobranca de {amount} referente a {serviceName}.",
            $"Forma de cobranca: {methodLabel}."
        };

        if (!string.IsNullOrWhiteSpace(payment.ExternalQrCode))
        {
            lines.Add(string.Empty);
            lines.Add("PIX copia e cola:");
            lines.Add(payment.ExternalQrCode);
        }

        if (!string.IsNullOrWhiteSpace(payment.ExternalCheckoutUrl))
        {
            lines.Add(string.Empty);
            lines.Add("Link de pagamento:");
            lines.Add(payment.ExternalCheckoutUrl);
        }

        lines.Add(string.Empty);
        lines.Add("Se precisar de ajuda, responda esta mensagem.");
        return string.Join(Environment.NewLine, lines);
    }

    private async Task SendChargeNotificationAsync(Appointment appt, Payment payment, string method)
    {
        var patient = await _db.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == appt.PatientId);

        if (patient == null || patient.User == null)
            return;

        var msg = new PatientMessage
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            ClinicId = appt.ClinicId,
            Content = BuildChargeMessage(appt, payment, method),
            Direction = "OUT",
            SentByUserId = GetUserId() != Guid.Empty ? GetUserId() : null,
            IsRead = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.PatientMessages.Add(msg);
    }

    [HttpGet]
    public async Task<ActionResult<List<PaymentResponseDto>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var clinicId = GetClinicId();

        IQueryable<Payment> query = _db.Payments
            .Include(p => p.Appointment)
            .Where(p => p.Appointment.ClinicId == clinicId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(p => p.Status == status);

        if (from.HasValue)
            query = query.Where(p => p.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(p => p.CreatedAt <= to.Value);

        var list = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PaymentResponseDto
            {
                Id = p.Id,
                AppointmentId = p.AppointmentId,
                Amount = p.Amount,
                Status = p.Status,
                PaymentMethod = p.PaymentMethod,
                TransactionId = p.TransactionId,
                PaymentDate = p.PaymentDate,
                Notes = p.Notes,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PaymentResponseDto>> GetById(Guid id)
    {
        var payment = await _db.Payments.FindAsync(id);
        if (payment == null)
            return NotFound(new { message = "Pagamento nao encontrado." });

        return Ok(new PaymentResponseDto
        {
            Id = payment.Id,
            AppointmentId = payment.AppointmentId,
            Amount = payment.Amount,
            Status = payment.Status,
            PaymentMethod = payment.PaymentMethod,
            TransactionId = payment.TransactionId,
            PaymentDate = payment.PaymentDate,
            Notes = payment.Notes,
            CreatedAt = payment.CreatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<PaymentResponseDto>> Create([FromBody] CreatePaymentDto dto)
    {
        var appt = await _db.Appointments.FindAsync(dto.AppointmentId);
        if (appt == null)
            return NotFound(new { message = "Consulta nao encontrada." });

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            AppointmentId = dto.AppointmentId,
            Amount = dto.Amount,
            Status = "PENDING",
            PaymentMethod = dto.PaymentMethod,
            TransactionId = dto.TransactionId,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = payment.Id }, new PaymentResponseDto
        {
            Id = payment.Id,
            AppointmentId = payment.AppointmentId,
            Amount = payment.Amount,
            Status = payment.Status,
            PaymentMethod = payment.PaymentMethod,
            TransactionId = payment.TransactionId,
            PaymentDate = payment.PaymentDate,
            Notes = payment.Notes,
            CreatedAt = payment.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PaymentResponseDto>> Update(Guid id, [FromBody] UpdatePaymentDto dto)
    {
        var payment = await _db.Payments.FindAsync(id);
        if (payment == null)
            return NotFound(new { message = "Pagamento nao encontrado." });

        if (dto.Amount.HasValue) payment.Amount = dto.Amount.Value;
        if (dto.Status != null) payment.Status = dto.Status;
        if (dto.PaymentMethod != null) payment.PaymentMethod = dto.PaymentMethod;
        if (dto.TransactionId != null) payment.TransactionId = dto.TransactionId;
        if (dto.PaymentDate.HasValue) payment.PaymentDate = dto.PaymentDate.Value;
        if (dto.Notes != null) payment.Notes = dto.Notes;
        payment.UpdatedAt = DateTime.UtcNow;

        if (dto.Status == "PAID" && !payment.PaymentDate.HasValue)
            payment.PaymentDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new PaymentResponseDto
        {
            Id = payment.Id,
            AppointmentId = payment.AppointmentId,
            Amount = payment.Amount,
            Status = payment.Status,
            PaymentMethod = payment.PaymentMethod,
            TransactionId = payment.TransactionId,
            PaymentDate = payment.PaymentDate,
            Notes = payment.Notes,
            CreatedAt = payment.CreatedAt
        });
    }

    [HttpPost("{id}/pay")]
    public async Task<ActionResult<PaymentResponseDto>> MarkAsPaid(Guid id)
    {
        var payment = await _db.Payments.FindAsync(id);
        if (payment == null)
            return NotFound(new { message = "Pagamento nao encontrado." });

        payment.Status = "PAID";
        payment.PaymentDate = DateTime.UtcNow;
        payment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new PaymentResponseDto
        {
            Id = payment.Id,
            AppointmentId = payment.AppointmentId,
            Amount = payment.Amount,
            Status = payment.Status,
            PaymentMethod = payment.PaymentMethod,
            TransactionId = payment.TransactionId,
            PaymentDate = payment.PaymentDate,
            Notes = payment.Notes,
            CreatedAt = payment.CreatedAt
        });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var payment = await _db.Payments.FindAsync(id);
        if (payment == null)
            return NotFound(new { message = "Pagamento nao encontrado." });

        _db.Payments.Remove(payment);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("charge")]
    public async Task<ActionResult<ChargeResponseDto>> Charge([FromBody] ChargeRequestDto dto)
    {
        var appt = await _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Payment)
            .FirstOrDefaultAsync(a => a.Id == dto.AppointmentId);

        if (appt == null)
            return NotFound(new { message = "Agendamento nao encontrado." });

        if (appt.Payment?.Status == "PAID")
        {
            return Conflict(new
            {
                message = "Este atendimento ja possui cobranca paga. Nao e permitido registrar uma nova cobranca."
            });
        }

        var amount = dto.Amount ?? appt.Service?.Price ?? 0m;
        var description = appt.Service?.Name ?? "Consulta";
        var paidBefore = appt.Status != "COMPLETED";
        var mpToken = await GetClinicMpTokenAsync(appt.ClinicId);

        var payment = appt.Payment;
        if (payment == null)
        {
            payment = new Payment
            {
                Id = Guid.NewGuid(),
                AppointmentId = appt.Id,
                CreatedAt = DateTime.UtcNow,
            };
            _db.Payments.Add(payment);
        }

        payment.Amount = amount;
        payment.PaymentMethod = dto.Method;
        payment.Notes = dto.Notes;
        payment.PaidBeforeCompletion = paidBefore;
        payment.ExternalPaymentId = null;
        payment.ExternalQrCode = null;
        payment.ExternalQrCodeBase64 = null;
        payment.ExternalCheckoutUrl = null;
        payment.UpdatedAt = DateTime.UtcNow;

        var paymentReference = GetPaymentReference(payment);

        var resp = new ChargeResponseDto
        {
            PaymentId = payment.Id,
            Method = dto.Method,
            Amount = amount,
            PaidBeforeCompletion = paidBefore,
        };

        switch (dto.Method)
        {
            case "CASH":
            case "INSURANCE":
            case "OTHER":
                payment.Status = "PAID";
                payment.PaymentDate = DateTime.UtcNow;
                resp.Status = "PAID";
                break;

            case "PIX":
                try
                {
                    var pix = await _mp.CreatePixAsync(
                        amount,
                        description,
                        dto.PayerEmail ?? "",
                        dto.PayerFirstName,
                        dto.PayerLastName,
                        dto.PayerCpf,
                        paymentReference,
                        mpToken);

                    payment.Status = "PENDING";
                    payment.ExternalPaymentId = pix.ExternalId;
                    payment.ExternalQrCode = pix.QrCode;
                    payment.ExternalQrCodeBase64 = pix.QrCodeBase64;
                    resp.Status = "PENDING";
                    resp.ExternalPaymentId = pix.ExternalId;
                    resp.QrCode = pix.QrCode;
                    resp.QrCodeBase64 = pix.QrCodeBase64;
                }
                catch (Exception ex)
                {
                    return BadRequest(new { message = $"Erro ao gerar PIX: {ex.Message}" });
                }
                break;

            case "CREDIT_CARD":
            case "DEBIT_CARD":
                try
                {
                    var pref = await _mp.CreatePreferenceAsync(
                        amount,
                        description,
                        dto.PayerEmail ?? "",
                        paymentReference,
                        mpToken);

                    payment.Status = "PENDING";
                    payment.ExternalPaymentId = pref.ExternalId;
                    payment.ExternalCheckoutUrl = pref.CheckoutUrl;
                    resp.Status = "PENDING";
                    resp.ExternalPaymentId = pref.ExternalId;
                    resp.CheckoutUrl = pref.CheckoutUrl;
                }
                catch (Exception ex)
                {
                    return BadRequest(new { message = $"Erro ao gerar link de pagamento: {ex.Message}" });
                }
                break;

            default:
                payment.Status = "PAID";
                payment.PaymentDate = DateTime.UtcNow;
                resp.Status = "PAID";
                break;
        }

        await SendChargeNotificationAsync(appt, payment, dto.Method);
        await _db.SaveChangesAsync();
        resp.PaymentId = payment.Id;
        return Ok(resp);
    }

    [HttpGet("charge/{paymentId}/status")]
    public async Task<ActionResult> CheckChargeStatus(Guid paymentId)
    {
        var payment = await _db.Payments
            .Include(p => p.Appointment)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null)
            return NotFound(new { message = "Pagamento nao encontrado." });

        if (payment.Status == "PAID")
            return Ok(new { status = "PAID", paymentId });

        try
        {
            var clinicMpToken = await GetClinicMpTokenAsync(payment.Appointment.ClinicId);
            var mpStatus = await ResolveMercadoPagoStatusAsync(payment, clinicMpToken);

            if (mpStatus == null)
                return Ok(new { status = payment.Status, paymentId });

            var internalStatus = MapMercadoPagoStatus(mpStatus.Status);
            var changed = false;

            if (!string.Equals(payment.ExternalPaymentId, mpStatus.ExternalId, StringComparison.Ordinal))
            {
                payment.ExternalPaymentId = mpStatus.ExternalId;
                changed = true;
            }

            if (!string.Equals(payment.Status, internalStatus, StringComparison.Ordinal))
            {
                payment.Status = internalStatus;
                payment.UpdatedAt = DateTime.UtcNow;
                if (internalStatus == "PAID" && !payment.PaymentDate.HasValue)
                    payment.PaymentDate = DateTime.UtcNow;
                changed = true;
            }

            if (changed)
                await _db.SaveChangesAsync();

            return Ok(new
            {
                status = payment.Status,
                gatewayStatus = mpStatus.Status,
                paymentId,
                externalPaymentId = payment.ExternalPaymentId,
            });
        }
        catch (Exception ex)
        {
            return Ok(new { status = payment.Status, paymentId, warning = ex.Message });
        }
    }
}
