using System.Security.Claims;
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
public class AnnouncementsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AnnouncementsController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : Guid.Empty;

    // GET /api/announcements
    [HttpGet]
    public async Task<ActionResult<List<AnnouncementResponseDto>>> GetAll()
    {
        var clinicId = GetClinicId();
        var list = await _db.Announcements
            .Where(a => a.ClinicId == clinicId && a.Active)
            .Include(a => a.PublishedBy)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(list.Select(ToDto));
    }

    // POST /api/announcements
    [HttpPost]
    public async Task<ActionResult<AnnouncementResponseDto>> Create([FromBody] CreateAnnouncementDto dto)
    {
        var clinicId = dto.ClinicId.HasValue && dto.ClinicId.Value != Guid.Empty
            ? dto.ClinicId.Value
            : GetClinicId();

        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Clínica não identificada." });

        var userId = GetUserId();
        if (userId == Guid.Empty)
            return BadRequest(new { message = "Usuário não identificado." });

        var announcement = new Announcement
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PublishedById = userId,
            Title = dto.Title,
            Content = dto.Content,
            FileUrl = dto.FileUrl,
            Urgency = dto.Urgency,
            Audience = dto.Audience,
            AudienceIds = dto.AudienceIds,
            Active = true,
            ExpiresAt = dto.ExpiresAt,
            CreatedAt = DateTime.UtcNow
        };

        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync();

        // Reload with navigation
        var created = await _db.Announcements
            .Include(a => a.PublishedBy)
            .FirstAsync(a => a.Id == announcement.Id);

        return CreatedAtAction(nameof(GetAll), ToDto(created));
    }

    // PUT /api/announcements/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<AnnouncementResponseDto>> Update(Guid id, [FromBody] UpdateAnnouncementDto dto)
    {
        var a = await _db.Announcements.Include(x => x.PublishedBy).FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound(new { message = "Aviso não encontrado." });

        if (dto.Title != null) a.Title = dto.Title;
        if (dto.Content != null) a.Content = dto.Content;
        if (dto.Urgency != null) a.Urgency = dto.Urgency;
        if (dto.Audience != null) a.Audience = dto.Audience;
        if (dto.AudienceIds != null) a.AudienceIds = dto.AudienceIds;
        if (dto.Active.HasValue) a.Active = dto.Active.Value;
        if (dto.ExpiresAt.HasValue) a.ExpiresAt = dto.ExpiresAt.Value;
        a.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(ToDto(a));
    }

    // DELETE /api/announcements/{id} — soft delete (archive)
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var a = await _db.Announcements.FindAsync(id);
        if (a == null) return NotFound(new { message = "Aviso não encontrado." });

        a.Active = false;
        a.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/announcements/{id}/resend — just updates the timestamp
    [HttpPost("{id}/resend")]
    public async Task<ActionResult> Resend(Guid id)
    {
        var a = await _db.Announcements.FindAsync(id);
        if (a == null) return NotFound(new { message = "Aviso não encontrado." });

        a.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Aviso reenviado." });
    }

    private static AnnouncementResponseDto ToDto(Announcement a) => new()
    {
        Id = a.Id,
        ClinicId = a.ClinicId,
        PublishedById = a.PublishedById,
        Title = a.Title,
        Content = a.Content,
        FileUrl = a.FileUrl,
        Urgency = a.Urgency,
        Audience = a.Audience,
        AudienceIds = a.AudienceIds,
        Active = a.Active,
        ExpiresAt = a.ExpiresAt,
        CreatedAt = a.CreatedAt,
        PublishedBy = a.PublishedBy != null ? new AnnouncementPublisherDto
        {
            Id = a.PublishedBy.Id,
            Name = a.PublishedBy.Name,
            AvatarUrl = a.PublishedBy.AvatarUrl
        } : null
    };
}
