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
public class AppointmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AppointmentsController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    // GET /api/appointments?start=2026-04-10&end=2026-04-11&professionalId=xxx&date=2026-04-10
    [HttpGet]
    public async Task<ActionResult<List<AppointmentResponseDto>>> GetAll(
        [FromQuery] DateTime? start,
        [FromQuery] DateTime? end,
        [FromQuery] DateTime? date,
        [FromQuery] Guid? professionalId)
    {
        var clinicId = GetClinicId();
        IQueryable<Appointment> query = _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .Where(a => a.ClinicId == clinicId);

        // Suporta range (start+end) ou dia único (date)
        if (start.HasValue)
            query = query.Where(a => a.StartTime >= start.Value);
        if (end.HasValue)
            query = query.Where(a => a.StartTime < end.Value);

        if (date.HasValue && !start.HasValue)
        {
            var dayStart = date.Value.Date;
            query = query.Where(a => a.StartTime >= dayStart && a.StartTime < dayStart.AddDays(1));
        }

        // Filtra por profissional
        if (professionalId.HasValue)
            query = query.Where(a => a.ProfessionalId == professionalId.Value);

        var appointments = await query
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        return Ok(appointments.Select(ToDto));
    }

    // GET /api/appointments/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<AppointmentResponseDto>> GetById(Guid id)
    {
        var appt = await _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appt == null)
            return NotFound(new { message = "Consulta não encontrada." });

        return Ok(ToDto(appt));
    }

    // POST /api/appointments
    [HttpPost]
    public async Task<ActionResult<AppointmentResponseDto>> Create([FromBody] CreateAppointmentDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não vinculado a uma clínica." });

        // Busca o serviço para calcular o EndTime
        var service = await _db.Services.FindAsync(dto.ServiceId);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        var endTime = dto.StartTime.AddMinutes(service.DurationMinutes);

        // Verifica conflito de horário do profissional
        var conflict = await _db.Appointments.AnyAsync(a =>
            a.ProfessionalId == dto.ProfessionalId &&
            a.Status != "CANCELLED" &&
            a.StartTime < endTime &&
            a.EndTime > dto.StartTime
        );

        if (conflict)
            return Conflict(new { message = "Profissional já possui consulta neste horário." });

        var appt = new Appointment
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            ServiceId = dto.ServiceId,
            PatientId = dto.PatientId,
            ProfessionalId = dto.ProfessionalId,
            RoomId = dto.RoomId,
            StartTime = dto.StartTime,
            EndTime = endTime,
            Status = "SCHEDULED",
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.Appointments.Add(appt);
        await _db.SaveChangesAsync();

        // Recarrega com Includes para montar o DTO
        var created = await _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .FirstAsync(a => a.Id == appt.Id);

        return CreatedAtAction(nameof(GetById), new { id = appt.Id }, ToDto(created));
    }

    // PUT /api/appointments/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<AppointmentResponseDto>> Update(Guid id, [FromBody] UpdateAppointmentDto dto)
    {
        var appt = await _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appt == null)
            return NotFound(new { message = "Consulta não encontrada." });

        if (dto.Status != null) appt.Status = dto.Status;
        if (dto.RoomId.HasValue) appt.RoomId = dto.RoomId.Value;
        if (dto.Notes != null) appt.Notes = dto.Notes;

        // Se mudou o horário, recalcula EndTime e verifica conflito
        if (dto.StartTime.HasValue)
        {
            var newEnd = dto.StartTime.Value.AddMinutes(appt.Service.DurationMinutes);
            var conflict = await _db.Appointments.AnyAsync(a =>
                a.Id != id &&
                a.ProfessionalId == appt.ProfessionalId &&
                a.Status != "CANCELLED" &&
                a.StartTime < newEnd &&
                a.EndTime > dto.StartTime.Value
            );

            if (conflict)
                return Conflict(new { message = "Conflito de horário." });

            appt.StartTime = dto.StartTime.Value;
            appt.EndTime = newEnd;
        }

        appt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ToDto(appt));
    }

    // PATCH /api/appointments/{id}/status — atualiza só o status
    [HttpPatch("{id}/status")]
    public async Task<ActionResult<AppointmentResponseDto>> UpdateStatus(Guid id, [FromBody] UpdateStatusDto dto)
    {
        var appt = await _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appt == null) return NotFound(new { message = "Consulta não encontrada." });

        appt.Status = dto.Status;
        appt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ToDto(appt));
    }

    // PATCH /api/appointments/{id}/cancel — cancela com motivo opcional
    [HttpPatch("{id}/cancel")]
    public async Task<ActionResult> CancelWithReason(Guid id, [FromBody] CancelAppointmentDto dto)
    {
        var appt = await _db.Appointments.FindAsync(id);
        if (appt == null) return NotFound(new { message = "Consulta não encontrada." });

        appt.Status = "CANCELLED";
        if (!string.IsNullOrEmpty(dto.Reason))
            appt.Notes = $"[CANCELADO] {dto.Reason}";
        appt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // DELETE /api/appointments/{id} — cancela a consulta
    [HttpDelete("{id}")]
    public async Task<ActionResult> Cancel(Guid id)
    {
        var appt = await _db.Appointments.FindAsync(id);
        if (appt == null)
            return NotFound(new { message = "Consulta não encontrada." });

        appt.Status = "CANCELLED";
        appt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static AppointmentResponseDto ToDto(Appointment a) => new()
    {
        Id = a.Id,
        StartTime = a.StartTime,
        EndTime = a.EndTime,
        Status = a.Status,
        Notes = a.Notes,
        CreatedAt = a.CreatedAt,
        Service = new AppointmentServiceDto
        {
            Id = a.Service.Id,
            Name = a.Service.Name,
            Duration = a.Service.DurationMinutes,
            Color = a.Service.Color,
            Price = a.Service.Price
        },
        Patient = new AppointmentPersonDto
        {
            Id = a.Patient.Id,
            Name = a.Patient.User.Name,
            AvatarUrl = a.Patient.User.AvatarUrl
        },
        Professional = new AppointmentPersonDto
        {
            Id = a.Professional.Id,
            Name = a.Professional.User.Name,
            AvatarUrl = a.Professional.User.AvatarUrl
        },
        Room = a.Room != null ? new AppointmentRoomDto
        {
            Id = a.Room.Id,
            Name = a.Room.Name
        } : null
    };
}
