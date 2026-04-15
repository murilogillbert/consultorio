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
public class SchedulesController : ControllerBase
{
    private readonly AppDbContext _db;

    public SchedulesController(AppDbContext db) => _db = db;

    // GET /api/schedules/{professionalId}
    // Retorna os horários de trabalho do profissional
    [HttpGet("{professionalId}")]
    [AllowAnonymous]
    public async Task<ActionResult<List<ScheduleResponseDto>>> GetSchedule(Guid professionalId)
    {
        var schedules = await _db.Schedules
            .Where(s => s.ProfessionalId == professionalId && s.IsActive)
            .OrderBy(s => s.DayOfWeek)
            .ThenBy(s => s.StartTime)
            .Select(s => new ScheduleResponseDto
            {
                Id = s.Id,
                ProfessionalId = s.ProfessionalId,
                DayOfWeek = s.DayOfWeek,
                StartTime = s.StartTime.ToString(@"hh\:mm"),
                EndTime = s.EndTime.ToString(@"hh\:mm"),
                IsActive = s.IsActive
            })
            .ToListAsync();

        return Ok(schedules);
    }

    // POST /api/schedules — define todos os horários de um profissional
    // Apaga os horários antigos e cria os novos (substituição completa)
    [HttpPost]
    public async Task<ActionResult<List<ScheduleResponseDto>>> SetSchedule([FromBody] SetScheduleDto dto)
    {
        // Remove horários antigos
        var existing = await _db.Schedules
            .Where(s => s.ProfessionalId == dto.ProfessionalId)
            .ToListAsync();
        _db.Schedules.RemoveRange(existing);

        // Cria os novos
        var newSchedules = dto.Slots.Select(slot => new Schedule
        {
            Id = Guid.NewGuid(),
            ProfessionalId = dto.ProfessionalId,
            DayOfWeek = slot.DayOfWeek,
            StartTime = TimeSpan.Parse(slot.StartTime),
            EndTime = TimeSpan.Parse(slot.EndTime),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _db.Schedules.AddRange(newSchedules);
        await _db.SaveChangesAsync();

        return Ok(newSchedules.Select(s => new ScheduleResponseDto
        {
            Id = s.Id,
            ProfessionalId = s.ProfessionalId,
            DayOfWeek = s.DayOfWeek,
            StartTime = s.StartTime.ToString(@"hh\:mm"),
            EndTime = s.EndTime.ToString(@"hh\:mm"),
            IsActive = s.IsActive
        }));
    }

    // GET /api/schedules/{professionalId}/available?date=2026-04-15&serviceId=xxx
    // Retorna os horários disponíveis para agendamento
    [HttpGet("{professionalId}/available")]
    [AllowAnonymous]
    public async Task<ActionResult<List<AvailableSlotDto>>> GetAvailableSlots(
        Guid professionalId,
        [FromQuery] DateTime date,
        [FromQuery] Guid serviceId)
    {
        // Busca duração do serviço
        var service = await _db.Services.FindAsync(serviceId);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        var duration = service.DurationMinutes;

        // Busca o horário de trabalho para o dia da semana
        var dayOfWeek = (int)date.DayOfWeek;
        var schedule = await _db.Schedules
            .Where(s => s.ProfessionalId == professionalId &&
                        s.DayOfWeek == dayOfWeek &&
                        s.IsActive)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        if (schedule.Count == 0)
            return Ok(new List<AvailableSlotDto>());

        // Busca consultas já agendadas nesse dia
        var dayStart = date.Date;
        var dayEnd = dayStart.AddDays(1);
        var appointments = await _db.Appointments
            .Where(a => a.ProfessionalId == professionalId &&
                        a.Status != "CANCELLED" &&
                        a.StartTime >= dayStart &&
                        a.StartTime < dayEnd)
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        // Busca bloqueios
        var blocks = await _db.Blocks
            .Where(b => b.ProfessionalId == professionalId &&
                        b.StartTime < dayEnd &&
                        b.EndTime > dayStart)
            .ToListAsync();

        // Gera os slots disponíveis
        var slots = new List<AvailableSlotDto>();

        foreach (var sch in schedule)
        {
            var current = dayStart.Add(sch.StartTime);
            var end = dayStart.Add(sch.EndTime);

            while (current.AddMinutes(duration) <= end)
            {
                var slotEnd = current.AddMinutes(duration);

                // Verifica se não conflita com consulta existente
                var hasConflict = appointments.Any(a =>
                    a.StartTime < slotEnd && a.EndTime > current);

                // Verifica se não está bloqueado
                var isBlocked = blocks.Any(b =>
                    b.StartTime < slotEnd && b.EndTime > current);

                // Ignora horários no passado
                var inPast = current < DateTime.UtcNow;

                if (!hasConflict && !isBlocked && !inPast)
                {
                    slots.Add(new AvailableSlotDto
                    {
                        StartTime = current.ToString("HH:mm"),
                        EndTime = slotEnd.ToString("HH:mm")
                    });
                }

                current = current.AddMinutes(duration);
            }
        }

        return Ok(slots);
    }
}
