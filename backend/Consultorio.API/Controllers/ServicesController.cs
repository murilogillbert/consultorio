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
public class ServicesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ServicesController(AppDbContext db) => _db = db;

    private Guid GetClinicId()
    {
        var claim = User.FindFirst("clinicId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    // Converte entidade → DTO (carregue Professionals, InsurancePlans, Equipments e Rooms antes)
    private static ServiceResponseDto ToDto(Service s) => new()
    {
        Id             = s.Id,
        Name           = s.Name,
        Description    = s.Description,
        ShortDescription = s.ShortDescription,
        Preparation    = s.Preparation,
        OnlineBooking  = s.OnlineBooking,
        DurationMinutes = s.DurationMinutes,
        Price          = s.Price,
        Category       = s.Category,
        RequiresRoom   = s.RequiresRoom,
        DefaultRoomId  = s.DefaultRoomId,
        Color          = s.Color,
        IsActive       = s.IsActive,
        CreatedAt      = s.CreatedAt,
        Professionals  = s.Professionals.Select(p => new ServiceProfessionalSummaryDto
        {
            Id   = p.Id,
            Name = p.User?.Name ?? "",
            AvatarUrl = p.User?.AvatarUrl
        }).ToList(),
        InsurancePlans = s.InsurancePlans.Select(i => new ServiceInsuranceSummaryDto
        {
            Id   = i.Id,
            Name = i.Name
        }).ToList(),
        Equipments = s.Equipments.Select(e => new ServiceEquipmentSummaryDto
        {
            Id   = e.Id,
            Name = e.Name
        }).ToList(),
        Rooms = s.Rooms.Select(r => new ServiceRoomSummaryDto
        {
            Id   = r.Id,
            Name = r.Name
        }).ToList(),
    };

    private IQueryable<Service> FullQuery() =>
        _db.Services
            .Include(s => s.Professionals).ThenInclude(p => p.User)
            .Include(s => s.InsurancePlans)
            .Include(s => s.Equipments)
            .Include(s => s.Rooms);

    // ─── GET /api/services ─────────────────────────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ServiceResponseDto>>> GetAll([FromQuery] bool? activeOnly)
    {
        bool isAuthenticated = User.Identity?.IsAuthenticated == true;
        bool filterActive = activeOnly ?? !isAuthenticated;

        var query = FullQuery();

        if (filterActive)
            query = query.Where(s => s.IsActive);

        var services = await query.OrderBy(s => s.Name).ToListAsync();
        return Ok(services.Select(ToDto));
    }

    // ─── GET /api/services/{id} ────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<ActionResult<ServiceResponseDto>> GetById(Guid id)
    {
        var service = await FullQuery().FirstOrDefaultAsync(s => s.Id == id);

        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        return Ok(ToDto(service));
    }

    // ─── POST /api/services ────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<ServiceResponseDto>> Create([FromBody] CreateServiceDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não está vinculado a nenhuma clínica." });

        var service = new Service
        {
            Id              = Guid.NewGuid(),
            ClinicId        = clinicId,
            Name            = dto.Name,
            Description     = dto.Description,
            ShortDescription = dto.ShortDescription,
            Preparation     = dto.Preparation,
            OnlineBooking   = dto.OnlineBooking,
            DurationMinutes = dto.DurationMinutes,
            Price           = dto.Price,
            Category        = dto.Category,
            RequiresRoom    = dto.RequiresRoom,
            DefaultRoomId   = dto.DefaultRoomId,
            Color           = dto.Color,
            IsActive        = true,
            CreatedAt       = DateTime.UtcNow,
        };

        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        // Vincula profissionais
        if (dto.ProfessionalIds?.Count > 0)
        {
            var pros = await _db.Professionals
                .Include(p => p.Services)
                .Where(p => dto.ProfessionalIds.Contains(p.Id))
                .ToListAsync();
            foreach (var pro in pros)
                if (!pro.Services.Any(s => s.Id == service.Id))
                    pro.Services.Add(service);
            await _db.SaveChangesAsync();
        }

        // Vincula convênios
        if (dto.InsuranceIds?.Count > 0)
        {
            var plans = await _db.InsurancePlans
                .Where(p => dto.InsuranceIds.Contains(p.Id))
                .ToListAsync();
            foreach (var plan in plans)
                service.InsurancePlans.Add(plan);
            await _db.SaveChangesAsync();
        }

        // Vincula equipamentos
        if (dto.EquipmentIds?.Count > 0)
        {
            var equips = await _db.Equipments
                .Where(e => dto.EquipmentIds.Contains(e.Id))
                .ToListAsync();
            foreach (var eq in equips)
                service.Equipments.Add(eq);
            await _db.SaveChangesAsync();
        }

        // Vincula salas
        if (dto.RoomIds?.Count > 0)
        {
            var rooms = await _db.Rooms
                .Where(r => dto.RoomIds.Contains(r.Id))
                .ToListAsync();
            foreach (var room in rooms)
                service.Rooms.Add(room);
            await _db.SaveChangesAsync();
        }

        // Recarrega com navegação para montar DTO completo
        await _db.Entry(service).Collection(s => s.Professionals).Query().Include(p => p.User).LoadAsync();
        await _db.Entry(service).Collection(s => s.InsurancePlans).LoadAsync();
        await _db.Entry(service).Collection(s => s.Equipments).LoadAsync();
        await _db.Entry(service).Collection(s => s.Rooms).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = service.Id }, ToDto(service));
    }

    // ─── PUT /api/services/{id} ────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<ActionResult<ServiceResponseDto>> Update(Guid id, [FromBody] UpdateServiceDto dto)
    {
        var service = await FullQuery().FirstOrDefaultAsync(s => s.Id == id);

        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        if (dto.Name            != null) service.Name            = dto.Name;
        if (dto.Description     != null) service.Description     = dto.Description;
        if (dto.ShortDescription != null) service.ShortDescription = dto.ShortDescription;
        if (dto.Preparation     != null) service.Preparation     = dto.Preparation;
        if (dto.OnlineBooking.HasValue)  service.OnlineBooking   = dto.OnlineBooking.Value;
        if (dto.DurationMinutes.HasValue) service.DurationMinutes = dto.DurationMinutes.Value;
        if (dto.Price.HasValue)          service.Price           = dto.Price.Value;
        if (dto.Category        != null) service.Category        = dto.Category;
        if (dto.RequiresRoom.HasValue)   service.RequiresRoom    = dto.RequiresRoom.Value;
        if (dto.DefaultRoomId.HasValue)  service.DefaultRoomId   = dto.DefaultRoomId.Value;
        if (dto.Color           != null) service.Color           = dto.Color;
        if (dto.IsActive.HasValue)       service.IsActive        = dto.IsActive.Value;
        service.UpdatedAt = DateTime.UtcNow;

        // Sincroniza profissionais
        if (dto.ProfessionalIds != null)
        {
            var newPros = dto.ProfessionalIds.Count > 0
                ? await _db.Professionals
                    .Include(p => p.Services)
                    .Where(p => dto.ProfessionalIds.Contains(p.Id))
                    .ToListAsync()
                : new List<Professional>();

            var toRemove = service.Professionals
                .Where(p => !dto.ProfessionalIds.Contains(p.Id))
                .ToList();
            foreach (var p in toRemove)
                service.Professionals.Remove(p);

            foreach (var p in newPros)
                if (!service.Professionals.Any(sp => sp.Id == p.Id))
                    service.Professionals.Add(p);
        }

        // Sincroniza convênios
        if (dto.InsuranceIds != null)
        {
            var newPlans = dto.InsuranceIds.Count > 0
                ? await _db.InsurancePlans
                    .Where(p => dto.InsuranceIds.Contains(p.Id))
                    .ToListAsync()
                : new List<InsurancePlan>();

            var toRemove = service.InsurancePlans
                .Where(p => !dto.InsuranceIds.Contains(p.Id))
                .ToList();
            foreach (var p in toRemove)
                service.InsurancePlans.Remove(p);

            foreach (var p in newPlans)
                if (!service.InsurancePlans.Any(ip => ip.Id == p.Id))
                    service.InsurancePlans.Add(p);
        }

        // Sincroniza equipamentos
        if (dto.EquipmentIds != null)
        {
            var newEquips = dto.EquipmentIds.Count > 0
                ? await _db.Equipments
                    .Where(e => dto.EquipmentIds.Contains(e.Id))
                    .ToListAsync()
                : new List<Equipment>();

            var toRemove = service.Equipments
                .Where(e => !dto.EquipmentIds.Contains(e.Id))
                .ToList();
            foreach (var e in toRemove)
                service.Equipments.Remove(e);

            foreach (var e in newEquips)
                if (!service.Equipments.Any(se => se.Id == e.Id))
                    service.Equipments.Add(e);
        }

        // Sincroniza salas
        if (dto.RoomIds != null)
        {
            var newRooms = dto.RoomIds.Count > 0
                ? await _db.Rooms
                    .Where(r => dto.RoomIds.Contains(r.Id))
                    .ToListAsync()
                : new List<Room>();

            var toRemove = service.Rooms
                .Where(r => !dto.RoomIds.Contains(r.Id))
                .ToList();
            foreach (var r in toRemove)
                service.Rooms.Remove(r);

            foreach (var r in newRooms)
                if (!service.Rooms.Any(sr => sr.Id == r.Id))
                    service.Rooms.Add(r);
        }

        await _db.SaveChangesAsync();
        return Ok(ToDto(service));
    }

    // ─── PATCH /api/services/{id}/toggle-active ───────────────────────
    [HttpPatch("{id}/toggle-active")]
    public async Task<ActionResult<ServiceResponseDto>> ToggleActive(Guid id)
    {
        var service = await FullQuery().FirstOrDefaultAsync(s => s.Id == id);

        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        service.IsActive  = !service.IsActive;
        service.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ToDto(service));
    }

    // ─── DELETE /api/services/{id} ─────────────────────────────────────
    // Exclui permanentemente. Retorna 409 se houver agendamentos.
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var service = await _db.Services
            .Include(s => s.Appointments)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        if (service.Appointments?.Count > 0)
            return Conflict(new
            {
                message = $"Este serviço possui {service.Appointments.Count} agendamento(s) e não pode ser excluído. Desative-o para ocultá-lo do site."
            });

        _db.Services.Remove(service);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ─── GET /api/services/categories ─────────────────────────────────
    [HttpGet("categories")]
    public async Task<ActionResult> GetCategories()
    {
        var clinicId = GetClinicId();
        var categories = await _db.ServiceCategories
            .Where(c => c.ClinicId == clinicId && c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();
        return Ok(categories);
    }

    // ─── POST /api/services/categories ────────────────────────────────
    [HttpPost("categories")]
    public async Task<ActionResult> CreateCategory([FromBody] CreateCategoryDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não está vinculado a nenhuma clínica." });

        // Verifica duplicata
        var exists = await _db.ServiceCategories
            .AnyAsync(c => c.ClinicId == clinicId && c.Name.ToLower() == dto.Name.Trim().ToLower());
        if (exists)
            return Conflict(new { message = "Categoria já existe." });

        var category = new ServiceCategory
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Name = dto.Name.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.ServiceCategories.Add(category);
        await _db.SaveChangesAsync();

        return Created("", new { category.Id, category.Name });
    }

    // ─── DELETE /api/services/categories/{id} ─────────────────────────
    [HttpDelete("categories/{id}")]
    public async Task<ActionResult> DeleteCategory(Guid id)
    {
        var category = await _db.ServiceCategories.FindAsync(id);
        if (category == null)
            return NotFound(new { message = "Categoria não encontrada." });

        _db.ServiceCategories.Remove(category);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public class CreateCategoryDto
{
    public string Name { get; set; } = null!;
}
