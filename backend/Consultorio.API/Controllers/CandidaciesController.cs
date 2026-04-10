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
public class CandidaciesController : ControllerBase
{
    private readonly AppDbContext _db;
    public CandidaciesController(AppDbContext db) => _db = db;

    // ─── GET /api/candidacies?jobId=xxx ──────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<CandidacyResponseDto>>> GetAll([FromQuery] Guid? jobId)
    {
        IQueryable<Candidacy> query = _db.Candidacies;
        if (jobId.HasValue)
            query = query.Where(c => c.JobOpeningId == jobId.Value);

        var list = await query
            .OrderByDescending(c => c.SubmissionDate)
            .Select(c => new CandidacyResponseDto
            {
                Id = c.Id,
                JobOpeningId = c.JobOpeningId,
                CandidateName = c.CandidateName,
                CandidateEmail = c.CandidateEmail,
                CandidatePhone = c.CandidatePhone,
                ResumeUrl = c.ResumeUrl,
                Status = c.Status,
                Notes = c.Notes,
                SubmissionDate = c.SubmissionDate
            })
            .ToListAsync();

        return Ok(list);
    }

    // ─── GET /api/candidacies/{id} ────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<ActionResult<CandidacyResponseDto>> GetById(Guid id)
    {
        var c = await _db.Candidacies.FindAsync(id);
        if (c == null) return NotFound(new { message = "Candidatura não encontrada." });

        return Ok(new CandidacyResponseDto
        {
            Id = c.Id,
            JobOpeningId = c.JobOpeningId,
            CandidateName = c.CandidateName,
            CandidateEmail = c.CandidateEmail,
            CandidatePhone = c.CandidatePhone,
            ResumeUrl = c.ResumeUrl,
            Status = c.Status,
            Notes = c.Notes,
            SubmissionDate = c.SubmissionDate
        });
    }

    // ─── POST /api/candidacies ────────────────────────────────────────
    // Público — qualquer pessoa pode se candidatar
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<CandidacyResponseDto>> Create([FromBody] CreateCandidacyDto dto)
    {
        var job = await _db.JobOpenings.FindAsync(dto.JobOpeningId);
        if (job == null || !job.IsActive || job.Status != "OPEN")
            return BadRequest(new { message = "Vaga não disponível para candidaturas." });

        var c = new Candidacy
        {
            Id = Guid.NewGuid(),
            JobOpeningId = dto.JobOpeningId,
            CandidateName = dto.CandidateName,
            CandidateEmail = dto.CandidateEmail,
            CandidatePhone = dto.CandidatePhone,
            ResumeUrl = dto.ResumeUrl,
            Status = "SUBMITTED",
            Notes = dto.Notes,
            SubmissionDate = DateTime.UtcNow
        };

        _db.Candidacies.Add(c);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = c.Id }, new CandidacyResponseDto
        {
            Id = c.Id,
            JobOpeningId = c.JobOpeningId,
            CandidateName = c.CandidateName,
            CandidateEmail = c.CandidateEmail,
            CandidatePhone = c.CandidatePhone,
            ResumeUrl = c.ResumeUrl,
            Status = c.Status,
            Notes = c.Notes,
            SubmissionDate = c.SubmissionDate
        });
    }

    // ─── PUT /api/candidacies/{id} ────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<ActionResult<CandidacyResponseDto>> Update(Guid id, [FromBody] UpdateCandidacyDto dto)
    {
        var c = await _db.Candidacies.FindAsync(id);
        if (c == null) return NotFound(new { message = "Candidatura não encontrada." });

        if (dto.Status != null) c.Status = dto.Status;
        if (dto.Notes != null) c.Notes = dto.Notes;
        c.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new CandidacyResponseDto
        {
            Id = c.Id,
            JobOpeningId = c.JobOpeningId,
            CandidateName = c.CandidateName,
            CandidateEmail = c.CandidateEmail,
            CandidatePhone = c.CandidatePhone,
            ResumeUrl = c.ResumeUrl,
            Status = c.Status,
            Notes = c.Notes,
            SubmissionDate = c.SubmissionDate
        });
    }

    // ─── DELETE /api/candidacies/{id} ─────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var c = await _db.Candidacies.FindAsync(id);
        if (c == null) return NotFound(new { message = "Candidatura não encontrada." });

        _db.Candidacies.Remove(c);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
