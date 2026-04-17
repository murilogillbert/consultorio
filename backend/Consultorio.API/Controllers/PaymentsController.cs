using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
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
        var patient = await _db.Patients.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == appt.PatientId);
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

    // ─── GET /api/payments ────────────────────────────────────────────
    // Lista pagamentos da clínica do usuário, com filtros opcionais
    // Query params: status, from, to
    [HttpGet]
    public async Task<ActionResult<List<PaymentResponseDto>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var clinicId = GetClinicId();

        // Join com Appointment para filtrar por clínica
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

    // ─── GET /api/payments/{id} ───────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<ActionResult<PaymentResponseDto>> GetById(Guid id)
    {
        var p = await _db.Payments.FindAsync(id);
        if (p == null) return NotFound(new { message = "Pagamento não encontrado." });

        return Ok(new PaymentResponseDto
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
        });
    }

    // ─── POST /api/payments ───────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<PaymentResponseDto>> Create([FromBody] CreatePaymentDto dto)
    {
        var appt = await _db.Appointments.FindAsync(dto.AppointmentId);
        if (appt == null) return NotFound(new { message = "Consulta não encontrada." });

        var p = new Payment
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

        _db.Payments.Add(p);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = p.Id }, new PaymentResponseDto
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
        });
    }

    // ─── PUT /api/payments/{id} ───────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<ActionResult<PaymentResponseDto>> Update(Guid id, [FromBody] UpdatePaymentDto dto)
    {
        var p = await _db.Payments.FindAsync(id);
        if (p == null) return NotFound(new { message = "Pagamento não encontrado." });

        if (dto.Amount.HasValue) p.Amount = dto.Amount.Value;
        if (dto.Status != null) p.Status = dto.Status;
        if (dto.PaymentMethod != null) p.PaymentMethod = dto.PaymentMethod;
        if (dto.TransactionId != null) p.TransactionId = dto.TransactionId;
        if (dto.PaymentDate.HasValue) p.PaymentDate = dto.PaymentDate.Value;
        if (dto.Notes != null) p.Notes = dto.Notes;
        p.UpdatedAt = DateTime.UtcNow;

        // Se virou PAID e não tem PaymentDate, marca agora
        if (dto.Status == "PAID" && !p.PaymentDate.HasValue)
            p.PaymentDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new PaymentResponseDto
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
        });
    }

    // ─── POST /api/payments/{id}/pay ──────────────────────────────────
    // Marca o pagamento como pago
    [HttpPost("{id}/pay")]
    public async Task<ActionResult<PaymentResponseDto>> MarkAsPaid(Guid id)
    {
        var p = await _db.Payments.FindAsync(id);
        if (p == null) return NotFound(new { message = "Pagamento não encontrado." });

        p.Status = "PAID";
        p.PaymentDate = DateTime.UtcNow;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new PaymentResponseDto
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
        });
    }

    // ─── DELETE /api/payments/{id} ────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var p = await _db.Payments.FindAsync(id);
        if (p == null) return NotFound(new { message = "Pagamento não encontrado." });

        _db.Payments.Remove(p);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ─── POST /api/payments/charge ─────────────────────────────────────
    // Endpoint único da recepção para registrar cobrança em qualquer método.
    // Cria ou substitui o Payment do agendamento.
    [HttpPost("charge")]
    public async Task<ActionResult<ChargeResponseDto>> Charge([FromBody] ChargeRequestDto dto)
    {
        var appt = await _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Payment)
            .FirstOrDefaultAsync(a => a.Id == dto.AppointmentId);

        if (appt == null)
            return NotFound(new { message = "Agendamento não encontrado." });

        if (appt.Payment?.Status == "PAID")
            return Conflict(new { message = "Este atendimento já possui cobrança paga. Não é permitido registrar uma nova cobrança." });

        var amount = dto.Amount ?? appt.Service?.Price ?? 0;
        var description = appt.Service?.Name ?? "Consulta";
        var paidBefore = appt.Status != "COMPLETED";

        // Se já existe um pagamento pendente, reutiliza; senão cria novo
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

        var resp = new ChargeResponseDto
        {
            PaymentId = payment.Id,
            Method = dto.Method,
            Amount = amount,
            PaidBeforeCompletion = paidBefore,
        };

        switch (dto.Method)
        {
            // ── Métodos manuais: marcar como PAGO imediatamente ──────────
            case "CASH":
            case "INSURANCE":
            case "OTHER":
                payment.Status = "PAID";
                payment.PaymentDate = DateTime.UtcNow;
                resp.Status = "PAID";
                break;

            // ── PIX: gerar QR via Mercado Pago ───────────────────────────
            case "PIX":
                try
                {
                    var pix = await _mp.CreatePixAsync(
                        amount, description,
                        dto.PayerEmail ?? "", dto.PayerFirstName, dto.PayerLastName, dto.PayerCpf);
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

            // ── Cartão crédito / débito: gerar link de checkout ───────────
            case "CREDIT_CARD":
            case "DEBIT_CARD":
                try
                {
                    var pref = await _mp.CreatePreferenceAsync(amount, description, dto.PayerEmail ?? "");
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

    // ─── GET /api/payments/charge/{paymentId}/status ───────────────────
    // Consulta status no Mercado Pago e atualiza o banco se aprovado.
    [HttpGet("charge/{paymentId}/status")]
    public async Task<ActionResult> CheckChargeStatus(Guid paymentId)
    {
        var p = await _db.Payments.FindAsync(paymentId);
        if (p == null) return NotFound(new { message = "Pagamento não encontrado." });

        if (p.Status == "PAID")
            return Ok(new { status = "PAID", paymentId });

        if (string.IsNullOrEmpty(p.ExternalPaymentId))
            return Ok(new { status = p.Status, paymentId });

        try
        {
            var mpStatus = await _mp.GetPaymentStatusAsync(p.ExternalPaymentId);
            if (mpStatus.Status == "approved")
            {
                p.Status = "PAID";
                p.PaymentDate = DateTime.UtcNow;
                p.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
            return Ok(new { status = p.Status == "PAID" ? "PAID" : mpStatus.Status, paymentId });
        }
        catch (Exception ex)
        {
            return Ok(new { status = p.Status, paymentId, warning = ex.Message });
        }
    }
}
