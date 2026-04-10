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
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoomsController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    // GET /api/rooms
    [HttpGet]
    public async Task<ActionResult<List<RoomResponseDto>>> GetAll()
    {
        var clinicId = GetClinicId();
        var rooms = await _db.Rooms
            .Where(r => r.ClinicId == clinicId)
            .OrderBy(r => r.Name)
            .Select(r => new RoomResponseDto
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description,
                Location = r.Location,
                Capacity = r.Capacity,
                IsActive = r.IsActive,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();

        return Ok(rooms);
    }

    // POST /api/rooms
    [HttpPost]
    public async Task<ActionResult<RoomResponseDto>> Create([FromBody] CreateRoomDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não vinculado a uma clínica." });

        var room = new Room
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Name = dto.Name,
            Description = dto.Description,
            Location = dto.Location,
            Capacity = dto.Capacity,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new RoomResponseDto
        {
            Id = room.Id,
            Name = room.Name,
            Description = room.Description,
            Location = room.Location,
            Capacity = room.Capacity,
            IsActive = room.IsActive,
            CreatedAt = room.CreatedAt
        });
    }

    // PUT /api/rooms/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<RoomResponseDto>> Update(Guid id, [FromBody] UpdateRoomDto dto)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null)
            return NotFound(new { message = "Sala não encontrada." });

        if (dto.Name != null) room.Name = dto.Name;
        if (dto.Description != null) room.Description = dto.Description;
        if (dto.Location != null) room.Location = dto.Location;
        if (dto.Capacity.HasValue) room.Capacity = dto.Capacity.Value;
        if (dto.IsActive.HasValue) room.IsActive = dto.IsActive.Value;
        room.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new RoomResponseDto
        {
            Id = room.Id,
            Name = room.Name,
            Description = room.Description,
            Location = room.Location,
            Capacity = room.Capacity,
            IsActive = room.IsActive,
            CreatedAt = room.CreatedAt
        });
    }

    // DELETE /api/rooms/{id}
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null)
            return NotFound(new { message = "Sala não encontrada." });

        room.IsActive = false;
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
