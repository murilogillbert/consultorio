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
public class InsurancePlansController : ControllerBase
{
    private readonly AppDbContext _db;
    public InsurancePlansController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    private async Task<Guid?> ResolveClinicIdAsync()
    {
        // Authenticated requests carry the clinic id in the JWT.
        var fromClaim = GetClinicId();
        if (fromClaim != Guid.Empty) return fromClaim;

        // Anonymous (public site) — fall back to the only/first clinic, mirroring
        // the rest of the public endpoints which also assume a single-clinic deploy.
        var first = await _db.Clinics
            .Where(c => c.IsActive)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync();
        return first;
    }

    // ─── GET /api/insuranceplans ──────────────────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<InsurancePlanResponseDto>>> GetAll([FromQuery] bool? activeOnly)
    {
        var clinicId = await ResolveClinicIdAsync();
        IQueryable<InsurancePlan> query = _db.InsurancePlans;

        // Always isolate by clinic — mixing clinics caused the duplicate-display bug.
        if (clinicId.HasValue)
            query = query.Where(p => p.ClinicId == clinicId.Value);

        if (activeOnly == true)
            query = query.Where(p => p.IsActive);

        var list = await query
            .OrderBy(p => p.Name)
            .Select(p => new InsurancePlanResponseDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // ─── GET /api/insuranceplans/{id} ─────────────────────────────────
    [HttpGet("{id}")]
    public async Task<ActionResult<InsurancePlanResponseDto>> GetById(Guid id)
    {
        var clinicId = GetClinicId();
        var p = await _db.InsurancePlans.FindAsync(id);
        if (p == null) return NotFound(new { message = "Plano não encontrado." });
        if (clinicId != Guid.Empty && p.ClinicId != clinicId)
            return NotFound(new { message = "Plano não encontrado." });

        return Ok(new InsurancePlanResponseDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            IsActive = p.IsActive,
            CreatedAt = p.CreatedAt
        });
    }

    // ─── POST /api/insuranceplans ─────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<InsurancePlanResponseDto>> Create([FromBody] CreateInsurancePlanDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não vinculado a uma clínica." });

        var trimmed = (dto.Name ?? "").Trim();
        if (string.IsNullOrEmpty(trimmed))
            return BadRequest(new { message = "Nome é obrigatório." });

        // Evita duplicidade dentro da mesma clínica
        var exists = await _db.InsurancePlans
            .AnyAsync(p => p.ClinicId == clinicId && p.Name.ToLower() == trimmed.ToLower());
        if (exists)
            return Conflict(new { message = "Já existe um convênio com esse nome." });

        var p = new InsurancePlan
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Name = trimmed,
            Description = dto.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.InsurancePlans.Add(p);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = p.Id }, new InsurancePlanResponseDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            IsActive = p.IsActive,
            CreatedAt = p.CreatedAt
        });
    }

    // ─── PUT /api/insuranceplans/{id} ─────────────────────────────────
    [HttpPut("{id}")]
    public async Task<ActionResult<InsurancePlanResponseDto>> Update(Guid id, [FromBody] UpdateInsurancePlanDto dto)
    {
        var clinicId = GetClinicId();
        var p = await _db.InsurancePlans.FindAsync(id);
        if (p == null) return NotFound(new { message = "Plano não encontrado." });
        if (clinicId != Guid.Empty && p.ClinicId != clinicId)
            return NotFound(new { message = "Plano não encontrado." });

        if (dto.Name != null) p.Name = dto.Name.Trim();
        if (dto.Description != null) p.Description = dto.Description;
        if (dto.IsActive.HasValue) p.IsActive = dto.IsActive.Value;
        p.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new InsurancePlanResponseDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            IsActive = p.IsActive,
            CreatedAt = p.CreatedAt
        });
    }

    // ─── DELETE /api/insuranceplans/{id} ──────────────────────────────
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var clinicId = GetClinicId();
        var p = await _db.InsurancePlans.FindAsync(id);
        if (p == null) return NotFound(new { message = "Plano não encontrado." });
        if (clinicId != Guid.Empty && p.ClinicId != clinicId)
            return NotFound(new { message = "Plano não encontrado." });

        p.IsActive = false;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
