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

    // ─── GET /api/insuranceplans ──────────────────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<InsurancePlanResponseDto>>> GetAll([FromQuery] bool? activeOnly)
    {
        IQueryable<InsurancePlan> query = _db.InsurancePlans;

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
        var p = await _db.InsurancePlans.FindAsync(id);
        if (p == null) return NotFound(new { message = "Plano não encontrado." });

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
        var p = new InsurancePlan
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
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
        var p = await _db.InsurancePlans.FindAsync(id);
        if (p == null) return NotFound(new { message = "Plano não encontrado." });

        if (dto.Name != null) p.Name = dto.Name;
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
        var p = await _db.InsurancePlans.FindAsync(id);
        if (p == null) return NotFound(new { message = "Plano não encontrado." });

        p.IsActive = false;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
