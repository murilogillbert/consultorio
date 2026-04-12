using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.API.DTOs;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

// [Authorize] protege TODOS os endpoints deste controller — exige token JWT válido
// [AllowAnonymous] em endpoints individuais pode liberar acesso público
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ServicesController : ControllerBase
{
    // O EF Core injeta o AppDbContext automaticamente via DI (Dependency Injection)
    private readonly AppDbContext _db;

    public ServicesController(AppDbContext db)
    {
        _db = db;
    }

    // Helper: extrai o ClinicId do token JWT do usuário logado
    private Guid GetClinicId()
    {
        var claim = User.FindFirst("clinicId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    // ─── GET /api/services ─────────────────────────────────────────────
    // Lista todos os serviços — público (site pode acessar sem login)
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ServiceResponseDto>>> GetAll([FromQuery] bool? activeOnly)
    {
        IQueryable<Service> query = _db.Services;

        // Usuários anônimos (site público) só veem serviços ativos por padrão.
        // Usuários autenticados (admin) veem todos, a não ser que peçam ?activeOnly=true.
        bool isAuthenticated = User.Identity?.IsAuthenticated == true;
        bool filterActive = activeOnly ?? !isAuthenticated;
        if (filterActive)
            query = query.Where(s => s.IsActive);

        var services = await query
            .OrderBy(s => s.Name)
            .Select(s => new ServiceResponseDto
            {
                Id = s.Id,
                Name = s.Name,
                Description = s.Description,
                DurationMinutes = s.DurationMinutes,
                Price = s.Price,
                Category = s.Category,
                RequiresRoom = s.RequiresRoom,
                DefaultRoomId = s.DefaultRoomId,
                Color = s.Color,
                IsActive = s.IsActive,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();

        return Ok(services);
    }

    // ─── GET /api/services/{id} ────────────────────────────────────────
    // Busca um serviço por ID
    [HttpGet("{id}")]
    public async Task<ActionResult<ServiceResponseDto>> GetById(Guid id)
    {
        var service = await _db.Services.FindAsync(id);

        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." }); // HTTP 404

        return Ok(new ServiceResponseDto
        {
            Id = service.Id,
            Name = service.Name,
            Description = service.Description,
            DurationMinutes = service.DurationMinutes,
            Price = service.Price,
            Category = service.Category,
            RequiresRoom = service.RequiresRoom,
            DefaultRoomId = service.DefaultRoomId,
            Color = service.Color,
            IsActive = service.IsActive,
            CreatedAt = service.CreatedAt
        });
    }

    // ─── POST /api/services ────────────────────────────────────────────
    // Cria um novo serviço
    [HttpPost]
    public async Task<ActionResult<ServiceResponseDto>> Create([FromBody] CreateServiceDto dto)
    {
        // Pega o ClinicId do token JWT do usuário logado
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não está vinculado a nenhuma clínica." });

        // Cria a entidade a partir do DTO
        var service = new Service
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Name = dto.Name,
            Description = dto.Description,
            DurationMinutes = dto.DurationMinutes,
            Price = dto.Price,
            Category = dto.Category,
            RequiresRoom = dto.RequiresRoom,
            DefaultRoomId = dto.DefaultRoomId,
            Color = dto.Color,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Services.Add(service);       // Adiciona no contexto (não salva ainda)
        await _db.SaveChangesAsync();    // Persiste no banco de dados

        // Retorna HTTP 201 Created com o header Location apontando para o GET
        return CreatedAtAction(
            nameof(GetById),
            new { id = service.Id },
            new ServiceResponseDto
            {
                Id = service.Id,
                Name = service.Name,
                Description = service.Description,
                DurationMinutes = service.DurationMinutes,
                Price = service.Price,
                Category = service.Category,
                RequiresRoom = service.RequiresRoom,
                DefaultRoomId = service.DefaultRoomId,
                Color = service.Color,
                IsActive = service.IsActive,
                CreatedAt = service.CreatedAt
            }
        );
    }

    // ─── PUT /api/services/{id} ────────────────────────────────────────
    // Atualiza um serviço existente (atualização parcial)
    [HttpPut("{id}")]
    public async Task<ActionResult<ServiceResponseDto>> Update(Guid id, [FromBody] UpdateServiceDto dto)
    {
        var service = await _db.Services.FindAsync(id);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        // Só atualiza os campos que vieram preenchidos (não-null)
        if (dto.Name != null) service.Name = dto.Name;
        if (dto.Description != null) service.Description = dto.Description;
        if (dto.DurationMinutes.HasValue) service.DurationMinutes = dto.DurationMinutes.Value;
        if (dto.Price.HasValue) service.Price = dto.Price.Value;
        if (dto.Category != null) service.Category = dto.Category;
        if (dto.RequiresRoom.HasValue) service.RequiresRoom = dto.RequiresRoom.Value;
        if (dto.DefaultRoomId.HasValue) service.DefaultRoomId = dto.DefaultRoomId.Value;
        if (dto.Color != null) service.Color = dto.Color;
        if (dto.IsActive.HasValue) service.IsActive = dto.IsActive.Value;
        service.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new ServiceResponseDto
        {
            Id = service.Id,
            Name = service.Name,
            Description = service.Description,
            DurationMinutes = service.DurationMinutes,
            Price = service.Price,
            Category = service.Category,
            RequiresRoom = service.RequiresRoom,
            DefaultRoomId = service.DefaultRoomId,
            Color = service.Color,
            IsActive = service.IsActive,
            CreatedAt = service.CreatedAt
        });
    }

    // ─── PATCH /api/services/{id}/toggle-active ───────────────────────
    // Ativa ou desativa um serviço (soft delete / reativação)
    [HttpPatch("{id}/toggle-active")]
    public async Task<ActionResult<ServiceResponseDto>> ToggleActive(Guid id)
    {
        var service = await _db.Services.FindAsync(id);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        service.IsActive = !service.IsActive;
        service.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new ServiceResponseDto
        {
            Id = service.Id,
            Name = service.Name,
            Description = service.Description,
            DurationMinutes = service.DurationMinutes,
            Price = service.Price,
            Category = service.Category,
            RequiresRoom = service.RequiresRoom,
            DefaultRoomId = service.DefaultRoomId,
            Color = service.Color,
            IsActive = service.IsActive,
            CreatedAt = service.CreatedAt
        });
    }

    // ─── DELETE /api/services/{id} ─────────────────────────────────────
    // Exclui permanentemente um serviço do banco de dados.
    // Se o serviço tiver agendamentos vinculados, retorna 409 Conflict
    // e orienta a desativá-lo em vez de excluir.
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var service = await _db.Services
            .Include(s => s.Appointments)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        if (service.Appointments != null && service.Appointments.Count > 0)
            return Conflict(new
            {
                message = $"Este serviço possui {service.Appointments.Count} agendamento(s) e não pode ser excluído. Desative-o para ocultá-lo do site."
            });

        _db.Services.Remove(service);
        await _db.SaveChangesAsync();

        return NoContent(); // HTTP 204 — excluído com sucesso
    }
}
