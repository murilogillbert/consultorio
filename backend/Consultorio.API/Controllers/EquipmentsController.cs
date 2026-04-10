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
public class EquipmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public EquipmentsController(AppDbContext db) => _db = db;

    private Guid GetClinicId()
    {
        var claim = User.FindFirst("clinicId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    // ─── GET /api/equipments ──────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<EquipmentResponseDto>>> GetAll([FromQuery] bool? activeOnly)
    {
        var clinicId = GetClinicId();
        IQueryable<Equipment> query = _db.Equipments.Where(e => e.ClinicId == clinicId);

        if (activeOnly == true)
            query = query.Where(e => e.IsActive);

        var list = await query
            .OrderBy(e => e.Name)
            .Select(e => new EquipmentResponseDto
            {
                Id = e.Id,
                Name = e.Name,
                Description = e.Description,
                SerialNumber = e.SerialNumber,
                Location = e.Location,
                Status = e.Status,
                MaintenanceDate = e.MaintenanceDate,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // ─── GET /api/equipments/{id} ─────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<ActionResult<EquipmentResponseDto>> GetById(Guid id)
    {
        var e = await _db.Equipments.FindAsync(id);
        if (e == null) return NotFound(new { message = "Equipamento não encontrado." });

        return Ok(new EquipmentResponseDto
        {
            Id = e.Id,
            Name = e.Name,
            Description = e.Description,
            SerialNumber = e.SerialNumber,
            Location = e.Location,
            Status = e.Status,
            MaintenanceDate = e.MaintenanceDate,
            IsActive = e.IsActive,
            CreatedAt = e.CreatedAt
        });
    }

    // ─── POST /api/equipments ─────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<EquipmentResponseDto>> Create([FromBody] CreateEquipmentDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não está vinculado a nenhuma clínica." });

        var e = new Equipment
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Name = dto.Name,
            Description = dto.Description,
            SerialNumber = dto.SerialNumber,
            Location = dto.Location,
            Status = dto.Status ?? "OPERATIONAL",
            MaintenanceDate = dto.MaintenanceDate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Equipments.Add(e);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new EquipmentResponseDto
        {
            Id = e.Id,
            Name = e.Name,
            Description = e.Description,
            SerialNumber = e.SerialNumber,
            Location = e.Location,
            Status = e.Status,
            MaintenanceDate = e.MaintenanceDate,
            IsActive = e.IsActive,
            CreatedAt = e.CreatedAt
        });
    }

    // ─── PUT /api/equipments/{id} ─────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<ActionResult<EquipmentResponseDto>> Update(Guid id, [FromBody] UpdateEquipmentDto dto)
    {
        var e = await _db.Equipments.FindAsync(id);
        if (e == null) return NotFound(new { message = "Equipamento não encontrado." });

        if (dto.Name != null) e.Name = dto.Name;
        if (dto.Description != null) e.Description = dto.Description;
        if (dto.SerialNumber != null) e.SerialNumber = dto.SerialNumber;
        if (dto.Location != null) e.Location = dto.Location;
        if (dto.Status != null) e.Status = dto.Status;
        if (dto.MaintenanceDate.HasValue) e.MaintenanceDate = dto.MaintenanceDate.Value;
        if (dto.IsActive.HasValue) e.IsActive = dto.IsActive.Value;
        e.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new EquipmentResponseDto
        {
            Id = e.Id,
            Name = e.Name,
            Description = e.Description,
            SerialNumber = e.SerialNumber,
            Location = e.Location,
            Status = e.Status,
            MaintenanceDate = e.MaintenanceDate,
            IsActive = e.IsActive,
            CreatedAt = e.CreatedAt
        });
    }

    // ─── DELETE /api/equipments/{id} ──────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var e = await _db.Equipments.FindAsync(id);
        if (e == null) return NotFound(new { message = "Equipamento não encontrado." });

        e.IsActive = false;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ─── GET /api/equipments/{id}/usage ───────────────────────────────
    // Histórico de uso de um equipamento
    [HttpGet("{id}/usage")]
    public async Task<ActionResult<List<EquipmentUsageResponseDto>>> GetUsage(Guid id)
    {
        var list = await _db.EquipmentUsages
            .Where(u => u.EquipmentId == id)
            .OrderByDescending(u => u.StartTime)
            .Select(u => new EquipmentUsageResponseDto
            {
                Id = u.Id,
                EquipmentId = u.EquipmentId,
                AppointmentId = u.AppointmentId,
                StartTime = u.StartTime,
                EndTime = u.EndTime,
                Notes = u.Notes,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // ─── POST /api/equipments/usage ───────────────────────────────────
    // Registra uso do equipamento numa consulta
    [HttpPost("usage")]
    public async Task<ActionResult<EquipmentUsageResponseDto>> CreateUsage([FromBody] CreateEquipmentUsageDto dto)
    {
        var usage = new EquipmentUsage
        {
            Id = Guid.NewGuid(),
            EquipmentId = dto.EquipmentId,
            AppointmentId = dto.AppointmentId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.EquipmentUsages.Add(usage);
        await _db.SaveChangesAsync();

        return Ok(new EquipmentUsageResponseDto
        {
            Id = usage.Id,
            EquipmentId = usage.EquipmentId,
            AppointmentId = usage.AppointmentId,
            StartTime = usage.StartTime,
            EndTime = usage.EndTime,
            Notes = usage.Notes,
            CreatedAt = usage.CreatedAt
        });
    }

    // ─── DELETE /api/equipments/usage/{id} ────────────────────────────
    [HttpDelete("usage/{id}")]
    public async Task<ActionResult> DeleteUsage(Guid id)
    {
        var u = await _db.EquipmentUsages.FindAsync(id);
        if (u == null) return NotFound(new { message = "Registro de uso não encontrado." });

        _db.EquipmentUsages.Remove(u);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
