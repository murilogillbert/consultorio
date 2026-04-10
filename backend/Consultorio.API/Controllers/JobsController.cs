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
public class JobsController : ControllerBase
{
    private readonly AppDbContext _db;
    public JobsController(AppDbContext db) => _db = db;

    private Guid GetClinicId()
    {
        var claim = User.FindFirst("clinicId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    // ─── GET /api/jobs ────────────────────────────────────────────────
    // Público (página "Trabalhe Conosco" mostra vagas abertas)
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<JobOpeningResponseDto>>> GetAll([FromQuery] bool? openOnly)
    {
        IQueryable<JobOpening> query = _db.JobOpenings.Include(j => j.Candidacies);

        if (openOnly == true)
            query = query.Where(j => j.IsActive && j.Status == "OPEN");

        var list = await query
            .OrderByDescending(j => j.PostedDate)
            .Select(j => new JobOpeningResponseDto
            {
                Id = j.Id,
                Title = j.Title,
                Description = j.Description,
                Requirements = j.Requirements,
                Status = j.Status,
                PostedDate = j.PostedDate,
                ClosingDate = j.ClosingDate,
                IsActive = j.IsActive,
                CreatedAt = j.CreatedAt,
                CandidacyCount = j.Candidacies.Count
            })
            .ToListAsync();

        return Ok(list);
    }

    // ─── GET /api/jobs/{id} ───────────────────────────────────────────
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<JobOpeningResponseDto>> GetById(Guid id)
    {
        var j = await _db.JobOpenings
            .Include(j => j.Candidacies)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (j == null) return NotFound(new { message = "Vaga não encontrada." });

        return Ok(new JobOpeningResponseDto
        {
            Id = j.Id,
            Title = j.Title,
            Description = j.Description,
            Requirements = j.Requirements,
            Status = j.Status,
            PostedDate = j.PostedDate,
            ClosingDate = j.ClosingDate,
            IsActive = j.IsActive,
            CreatedAt = j.CreatedAt,
            CandidacyCount = j.Candidacies.Count
        });
    }

    // ─── POST /api/jobs ───────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<JobOpeningResponseDto>> Create([FromBody] CreateJobOpeningDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não está vinculado a nenhuma clínica." });

        var j = new JobOpening
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Title = dto.Title,
            Description = dto.Description,
            Requirements = dto.Requirements,
            Status = "OPEN",
            PostedDate = DateTime.UtcNow,
            ClosingDate = dto.ClosingDate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.JobOpenings.Add(j);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = j.Id }, new JobOpeningResponseDto
        {
            Id = j.Id,
            Title = j.Title,
            Description = j.Description,
            Requirements = j.Requirements,
            Status = j.Status,
            PostedDate = j.PostedDate,
            ClosingDate = j.ClosingDate,
            IsActive = j.IsActive,
            CreatedAt = j.CreatedAt,
            CandidacyCount = 0
        });
    }

    // ─── PUT /api/jobs/{id} ───────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<ActionResult<JobOpeningResponseDto>> Update(Guid id, [FromBody] UpdateJobOpeningDto dto)
    {
        var j = await _db.JobOpenings.FindAsync(id);
        if (j == null) return NotFound(new { message = "Vaga não encontrada." });

        if (dto.Title != null) j.Title = dto.Title;
        if (dto.Description != null) j.Description = dto.Description;
        if (dto.Requirements != null) j.Requirements = dto.Requirements;
        if (dto.Status != null) j.Status = dto.Status;
        if (dto.ClosingDate.HasValue) j.ClosingDate = dto.ClosingDate.Value;
        if (dto.IsActive.HasValue) j.IsActive = dto.IsActive.Value;
        j.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new JobOpeningResponseDto
        {
            Id = j.Id,
            Title = j.Title,
            Description = j.Description,
            Requirements = j.Requirements,
            Status = j.Status,
            PostedDate = j.PostedDate,
            ClosingDate = j.ClosingDate,
            IsActive = j.IsActive,
            CreatedAt = j.CreatedAt,
            CandidacyCount = await _db.Candidacies.CountAsync(c => c.JobOpeningId == j.Id)
        });
    }

    // ─── DELETE /api/jobs/{id} ────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var j = await _db.JobOpenings.FindAsync(id);
        if (j == null) return NotFound(new { message = "Vaga não encontrada." });

        j.IsActive = false;
        j.Status = "CLOSED";
        j.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
