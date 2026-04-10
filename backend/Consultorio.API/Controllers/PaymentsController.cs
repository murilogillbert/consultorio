using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.API.DTOs;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public PaymentsController(AppDbContext db) => _db = db;

    private Guid GetClinicId()
    {
        var claim = User.FindFirst("clinicId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
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
}
