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
                .ThenInclude(s => s.ServiceInsurancePlans)
            .Include(a => a.InsurancePlan)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .Include(a => a.Payment)
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
                .ThenInclude(s => s.ServiceInsurancePlans)
            .Include(a => a.InsurancePlan)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .Include(a => a.Payment)
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
        var service = await _db.Services
            .Include(s => s.ServiceInsurancePlans)
            .FirstOrDefaultAsync(s => s.Id == dto.ServiceId);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        if (dto.InsurancePlanId.HasValue)
        {
            var insuranceAllowed = await _db.ServiceInsurancePlans.AnyAsync(sip =>
                sip.ServiceId == dto.ServiceId && sip.InsurancePlanId == dto.InsurancePlanId.Value);

            if (!insuranceAllowed)
                return BadRequest(new { message = "O convênio selecionado não está disponível para este serviço." });
        }

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
            InsurancePlanId = dto.InsurancePlanId,
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
                .ThenInclude(s => s.ServiceInsurancePlans)
            .Include(a => a.InsurancePlan)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .Include(a => a.Payment)
            .FirstAsync(a => a.Id == appt.Id);

        return CreatedAtAction(nameof(GetById), new { id = appt.Id }, ToDto(created));
    }

    // PUT /api/appointments/{id}
    // Edita campos da consulta com validação completa de conflitos:
    // profissional (horário), sala (horário), equipamento (horário) e
    // disponibilidade do profissional na nova data/hora.
    [HttpPut("{id}")]
    public async Task<ActionResult<AppointmentResponseDto>> Update(Guid id, [FromBody] UpdateAppointmentDto dto)
    {
        var appt = await _db.Appointments
            .Include(a => a.Service)
                .ThenInclude(s => s.ServiceInsurancePlans)
            .Include(a => a.InsurancePlan)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .Include(a => a.Payment)
            .Include(a => a.EquipmentUsages)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appt == null)
            return NotFound(new { message = "Consulta não encontrada." });

        // Resolve novos valores (cai no atual quando não enviado).
        var newServiceId      = dto.ServiceId      ?? appt.ServiceId;
        var newPatientId      = dto.PatientId      ?? appt.PatientId;
        var newProfessionalId = dto.ProfessionalId ?? appt.ProfessionalId;
        var newRoomId         = dto.RoomId         ?? appt.RoomId;
        var newStart          = dto.StartTime      ?? appt.StartTime;

        // Carrega o serviço (caso tenha mudado) para calcular EndTime.
        Service service = appt.Service;
        if (newServiceId != appt.ServiceId)
        {
            var loaded = await _db.Services
                .Include(s => s.ServiceInsurancePlans)
                .FirstOrDefaultAsync(s => s.Id == newServiceId);
            if (loaded == null)
                return NotFound(new { message = "Serviço não encontrado." });
            if (!loaded.IsActive)
                return BadRequest(new { message = "Não é possível usar um serviço inativo." });
            service = loaded;
        }

        var newEnd = newStart.AddMinutes(service.DurationMinutes);

        // Conflito: profissional já tem outra consulta no novo intervalo.
        var profConflict = await _db.Appointments.AnyAsync(a =>
            a.Id != id &&
            a.ProfessionalId == newProfessionalId &&
            a.Status != "CANCELLED" &&
            a.StartTime < newEnd &&
            a.EndTime > newStart);
        if (profConflict)
            return Conflict(new { message = "Profissional já possui consulta neste horário." });

        // Conflito: sala já ocupada no novo intervalo.
        if (newRoomId.HasValue)
        {
            var roomConflict = await _db.Appointments.AnyAsync(a =>
                a.Id != id &&
                a.RoomId == newRoomId.Value &&
                a.Status != "CANCELLED" &&
                a.StartTime < newEnd &&
                a.EndTime > newStart);
            if (roomConflict)
                return Conflict(new { message = "Sala já está ocupada neste horário." });
        }

        // Conflito: equipamento já em uso no novo intervalo.
        if (dto.EquipmentId.HasValue)
        {
            var equipConflict = await _db.EquipmentUsages.AnyAsync(eu =>
                eu.EquipmentId == dto.EquipmentId.Value &&
                eu.AppointmentId != id &&
                eu.Appointment.Status != "CANCELLED" &&
                eu.StartTime < newEnd &&
                (eu.EndTime == null || eu.EndTime > newStart));
            if (equipConflict)
                return Conflict(new { message = "Equipamento já está em uso neste horário." });
        }

        // Validação do convênio (se mudou o serviço ou convênio).
        if (dto.InsurancePlanId.HasValue && dto.InsurancePlanId != Guid.Empty)
        {
            var insuranceAllowed = await _db.ServiceInsurancePlans.AnyAsync(sip =>
                sip.ServiceId == newServiceId && sip.InsurancePlanId == dto.InsurancePlanId.Value);
            if (!insuranceAllowed)
                return BadRequest(new { message = "Convênio não disponível para este serviço." });
        }

        // Aplica mudanças.
        appt.ServiceId       = newServiceId;
        appt.PatientId       = newPatientId;
        appt.ProfessionalId  = newProfessionalId;
        appt.RoomId          = newRoomId;
        appt.StartTime       = newStart;
        appt.EndTime         = newEnd;
        if (dto.InsurancePlanId.HasValue) appt.InsurancePlanId = dto.InsurancePlanId.Value == Guid.Empty ? null : dto.InsurancePlanId.Value;
        if (dto.Notes != null) appt.Notes = dto.Notes;
        if (dto.Status != null)
        {
            appt.Status = dto.Status;
            if (string.Equals(dto.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(appt.CancellationSource))
                appt.CancellationSource = "RECEPTION";
        }

        // Sincroniza Equipamento via EquipmentUsage (única associação por consulta).
        if (dto.EquipmentId.HasValue)
        {
            _db.EquipmentUsages.RemoveRange(appt.EquipmentUsages);
            if (dto.EquipmentId.Value != Guid.Empty)
            {
                _db.EquipmentUsages.Add(new EquipmentUsage
                {
                    Id = Guid.NewGuid(),
                    AppointmentId = appt.Id,
                    EquipmentId = dto.EquipmentId.Value,
                    StartTime = newStart,
                    EndTime = newEnd,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        appt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Recarrega com Includes para devolver DTO completo.
        var fresh = await _db.Appointments
            .Include(a => a.Service)
                .ThenInclude(s => s.ServiceInsurancePlans)
            .Include(a => a.InsurancePlan)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .Include(a => a.Payment)
            .FirstAsync(a => a.Id == id);

        return Ok(ToDto(fresh));
    }

    // POST /api/appointments/recurring
    // Cria N consultas semanalmente no mesmo dia/horário do StartTime informado,
    // até completar DurationDays (padrão 90). Cada ocorrência valida conflitos
    // independentemente — datas com conflito não bloqueiam as demais e são
    // retornadas em SkippedDates.
    [HttpPost("recurring")]
    public async Task<ActionResult<RecurringAppointmentsResultDto>> CreateRecurring([FromBody] CreateRecurringAppointmentsDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não vinculado a uma clínica." });

        var service = await _db.Services
            .Include(s => s.ServiceInsurancePlans)
            .FirstOrDefaultAsync(s => s.Id == dto.ServiceId);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });
        if (!service.IsActive)
            return BadRequest(new { message = "Não é possível agendar com um serviço inativo." });

        if (dto.InsurancePlanId.HasValue)
        {
            var insuranceAllowed = await _db.ServiceInsurancePlans.AnyAsync(sip =>
                sip.ServiceId == dto.ServiceId && sip.InsurancePlanId == dto.InsurancePlanId.Value);
            if (!insuranceAllowed)
                return BadRequest(new { message = "Convênio não disponível para este serviço." });
        }

        var durationDays = dto.DurationDays <= 0 ? 90 : dto.DurationDays;
        var horizon = dto.StartTime.AddDays(durationDays);
        var slot = dto.StartTime;

        var result = new RecurringAppointmentsResultDto();
        while (slot <= horizon)
        {
            var slotEnd = slot.AddMinutes(service.DurationMinutes);

            var conflict = await _db.Appointments.AnyAsync(a =>
                a.ProfessionalId == dto.ProfessionalId &&
                a.Status != "CANCELLED" &&
                a.StartTime < slotEnd &&
                a.EndTime > slot);

            if (conflict)
            {
                result.Skipped++;
                result.SkippedDates.Add(slot);
            }
            else
            {
                _db.Appointments.Add(new Appointment
                {
                    Id = Guid.NewGuid(),
                    ClinicId = clinicId,
                    ServiceId = dto.ServiceId,
                    InsurancePlanId = dto.InsurancePlanId,
                    PatientId = dto.PatientId,
                    ProfessionalId = dto.ProfessionalId,
                    RoomId = dto.RoomId,
                    StartTime = slot,
                    EndTime = slotEnd,
                    Status = "SCHEDULED",
                    Notes = dto.Notes,
                    CreatedAt = DateTime.UtcNow,
                });
                result.Created++;
                result.CreatedDates.Add(slot);
            }

            slot = slot.AddDays(7);
        }

        await _db.SaveChangesAsync();

        result.Message = result.Skipped == 0
            ? $"{result.Created} consulta(s) criada(s) com sucesso."
            : $"{result.Created} consulta(s) criada(s); {result.Skipped} pulada(s) por conflito de horário.";

        return Ok(result);
    }

    // PATCH /api/appointments/{id}/status — atualiza só o status
    [HttpPatch("{id}/status")]
    public async Task<ActionResult<AppointmentResponseDto>> UpdateStatus(Guid id, [FromBody] UpdateStatusDto dto)
    {
        var appt = await _db.Appointments
            .Include(a => a.Service)
                .ThenInclude(s => s.ServiceInsurancePlans)
            .Include(a => a.InsurancePlan)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Room)
            .Include(a => a.Payment)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appt == null) return NotFound(new { message = "Consulta não encontrada." });

        appt.Status = dto.Status;
        if (string.Equals(dto.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(appt.CancellationSource))
            appt.CancellationSource = "RECEPTION";
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
        appt.CancellationSource = string.IsNullOrWhiteSpace(dto.Source) ? "RECEPTION" : dto.Source.Trim().ToUpperInvariant();
        appt.CancelledAt = DateTime.UtcNow;
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
        appt.CancellationSource = "RECEPTION";
        appt.CancelledAt = DateTime.UtcNow;
        appt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static AppointmentResponseDto ToDto(Appointment a)
    {
        var selectedInsurance = a.Service.ServiceInsurancePlans
            .FirstOrDefault(sip => a.InsurancePlanId.HasValue && sip.InsurancePlanId == a.InsurancePlanId.Value);

        return new AppointmentResponseDto
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
                Price = a.Service.Price,
                ShowPrice = a.Service.ShowPrice,
                OnlineBooking = a.Service.OnlineBooking
            },
            InsurancePlan = a.InsurancePlan != null ? new AppointmentInsuranceDto
            {
                Id = a.InsurancePlan.Id,
                Name = a.InsurancePlan.Name,
                Price = selectedInsurance?.Price,
                ShowPrice = selectedInsurance?.ShowPrice ?? true
            } : null,
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
            } : null,
            CancellationSource = a.CancellationSource,
            CancelledAt = a.CancelledAt,
            PaymentStatus = a.Payment?.Status,
            PaymentAmount = a.Payment?.Amount,
            PaymentMethod = a.Payment?.PaymentMethod,
            PaymentId = a.Payment?.Id
        };
    }
}
