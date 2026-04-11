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
public class ChatChannelsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ChatChannelsController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    // GET /api/chatchannels
    [HttpGet]
    public async Task<ActionResult<List<ChatChannelResponseDto>>> GetAll()
    {
        var clinicId = GetClinicId();
        var channels = await _db.ChatChannels
            .Where(c => c.ClinicId == clinicId && c.IsActive)
            .Include(c => c.Members)
            .OrderBy(c => c.Name)
            .ToListAsync();

        return Ok(channels.Select(c => new ChatChannelResponseDto
        {
            Id = c.Id,
            ClinicId = c.ClinicId,
            Name = c.Name,
            Description = c.Description,
            Type = c.Type,
            AdminOnly = c.AdminOnly,
            Active = c.IsActive,
            MemberCount = c.Members.Count,
            CreatedAt = c.CreatedAt
        }));
    }

    // POST /api/chatchannels
    [HttpPost]
    public async Task<ActionResult<ChatChannelResponseDto>> Create([FromBody] CreateChatChannelDto dto)
    {
        var clinicId = dto.ClinicId != Guid.Empty ? dto.ClinicId : GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Clínica não identificada." });

        var channel = new ChatChannel
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Name = dto.Name,
            Description = dto.Description,
            Type = dto.Type,
            AdminOnly = dto.AdminOnly,
            IsActive = dto.Active,
            CreatedAt = DateTime.UtcNow
        };

        _db.ChatChannels.Add(channel);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new ChatChannelResponseDto
        {
            Id = channel.Id,
            ClinicId = channel.ClinicId,
            Name = channel.Name,
            Description = channel.Description,
            Type = channel.Type,
            AdminOnly = channel.AdminOnly,
            Active = channel.IsActive,
            MemberCount = 0,
            CreatedAt = channel.CreatedAt
        });
    }

    // PUT /api/chatchannels/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<ChatChannelResponseDto>> Update(Guid id, [FromBody] UpdateChatChannelDto dto)
    {
        var channel = await _db.ChatChannels
            .Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (channel == null)
            return NotFound(new { message = "Canal não encontrado." });

        if (dto.Name != null) channel.Name = dto.Name;
        if (dto.Description != null) channel.Description = dto.Description;
        if (dto.Type != null) channel.Type = dto.Type;
        if (dto.AdminOnly.HasValue) channel.AdminOnly = dto.AdminOnly.Value;
        if (dto.Active.HasValue) channel.IsActive = dto.Active.Value;
        channel.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new ChatChannelResponseDto
        {
            Id = channel.Id,
            ClinicId = channel.ClinicId,
            Name = channel.Name,
            Description = channel.Description,
            Type = channel.Type,
            AdminOnly = channel.AdminOnly,
            Active = channel.IsActive,
            MemberCount = channel.Members.Count,
            CreatedAt = channel.CreatedAt
        });
    }

    // DELETE /api/chatchannels/{id}
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var channel = await _db.ChatChannels.FindAsync(id);
        if (channel == null) return NotFound(new { message = "Canal não encontrado." });

        channel.IsActive = false;
        channel.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
