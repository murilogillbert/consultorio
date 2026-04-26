using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

/// <summary>
/// CRUD de categorias gerenciáveis pelo admin.
/// Tipos suportados: USER | PROFESSIONAL | SPECIALTY
/// (Especialidades podem opcionalmente referenciar uma categoria profissional via parentId.)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    public CategoriesController(AppDbContext db) => _db = db;

    private static readonly string[] AllowedTypes = { "USER", "PROFESSIONAL", "SPECIALTY" };

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    private async Task<Guid?> ResolveClinicIdAsync()
    {
        var fromClaim = GetClinicId();
        if (fromClaim != Guid.Empty) return fromClaim;
        return await _db.Clinics
            .Where(c => c.IsActive)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync();
    }

    public class CategoryResponse
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public Guid? ParentId { get; set; }
        public string? ParentName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateCategoryDto
    {
        public string Type { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public Guid? ParentId { get; set; }
    }

    public class UpdateCategoryDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public Guid? ParentId { get; set; }
        public bool? IsActive { get; set; }
    }

    private static CategoryResponse ToDto(Category c) => new()
    {
        Id = c.Id,
        Type = c.Type,
        Name = c.Name,
        Description = c.Description,
        ParentId = c.ParentId,
        ParentName = c.Parent?.Name,
        IsActive = c.IsActive,
        CreatedAt = c.CreatedAt,
    };

    // ─── GET /api/categories?type=USER|PROFESSIONAL|SPECIALTY&parentId={guid} ──
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<CategoryResponse>>> List(
        [FromQuery] string? type,
        [FromQuery] Guid? parentId,
        [FromQuery] bool? activeOnly)
    {
        var clinicId = await ResolveClinicIdAsync();
        if (!clinicId.HasValue) return Ok(new List<CategoryResponse>());

        IQueryable<Category> q = _db.Categories
            .Include(c => c.Parent)
            .Where(c => c.ClinicId == clinicId.Value);

        if (!string.IsNullOrWhiteSpace(type))
        {
            var normalized = type.Trim().ToUpperInvariant();
            q = q.Where(c => c.Type == normalized);
        }

        if (parentId.HasValue)
            q = q.Where(c => c.ParentId == parentId.Value);

        if (activeOnly == true)
            q = q.Where(c => c.IsActive);

        var items = await q.OrderBy(c => c.Type).ThenBy(c => c.Name).ToListAsync();
        return Ok(items.Select(ToDto));
    }

    // ─── POST /api/categories ─────────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<CategoryResponse>> Create([FromBody] CreateCategoryDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não vinculado a uma clínica." });

        var type = (dto.Type ?? "").Trim().ToUpperInvariant();
        if (!AllowedTypes.Contains(type))
            return BadRequest(new { message = "Tipo inválido. Use USER, PROFESSIONAL ou SPECIALTY." });

        var name = (dto.Name ?? "").Trim();
        if (string.IsNullOrEmpty(name))
            return BadRequest(new { message = "Nome é obrigatório." });

        // Especialidade pode referenciar uma categoria profissional como pai.
        if (dto.ParentId.HasValue)
        {
            if (type != "SPECIALTY")
                return BadRequest(new { message = "Apenas especialidades podem ter categoria-pai." });

            var parent = await _db.Categories.FindAsync(dto.ParentId.Value);
            if (parent == null || parent.ClinicId != clinicId || parent.Type != "PROFESSIONAL")
                return BadRequest(new { message = "Categoria-pai inválida." });
        }

        var dup = await _db.Categories.AnyAsync(c =>
            c.ClinicId == clinicId && c.Type == type && c.Name.ToLower() == name.ToLower());
        if (dup) return Conflict(new { message = "Já existe uma categoria com este nome." });

        var entity = new Category
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Type = type,
            Name = name,
            Description = dto.Description,
            ParentId = type == "SPECIALTY" ? dto.ParentId : null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Categories.Add(entity);
        await _db.SaveChangesAsync();
        await _db.Entry(entity).Reference(c => c.Parent).LoadAsync();

        return CreatedAtAction(nameof(List), null, ToDto(entity));
    }

    // ─── PUT /api/categories/{id} ────────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<ActionResult<CategoryResponse>> Update(Guid id, [FromBody] UpdateCategoryDto dto)
    {
        var clinicId = GetClinicId();
        var entity = await _db.Categories.Include(c => c.Parent).FirstOrDefaultAsync(c => c.Id == id);
        if (entity == null) return NotFound(new { message = "Categoria não encontrada." });
        if (clinicId != Guid.Empty && entity.ClinicId != clinicId)
            return NotFound(new { message = "Categoria não encontrada." });

        if (dto.Name != null)
        {
            var name = dto.Name.Trim();
            if (string.IsNullOrEmpty(name))
                return BadRequest(new { message = "Nome é obrigatório." });

            var dup = await _db.Categories.AnyAsync(c =>
                c.ClinicId == entity.ClinicId
                && c.Type == entity.Type
                && c.Id != entity.Id
                && c.Name.ToLower() == name.ToLower());
            if (dup) return Conflict(new { message = "Já existe uma categoria com este nome." });

            entity.Name = name;
        }

        if (dto.Description != null) entity.Description = dto.Description;

        if (dto.ParentId.HasValue && entity.Type == "SPECIALTY")
        {
            if (dto.ParentId.Value == Guid.Empty)
            {
                entity.ParentId = null;
            }
            else
            {
                var parent = await _db.Categories.FindAsync(dto.ParentId.Value);
                if (parent == null || parent.ClinicId != entity.ClinicId || parent.Type != "PROFESSIONAL")
                    return BadRequest(new { message = "Categoria-pai inválida." });
                entity.ParentId = parent.Id;
            }
        }

        if (dto.IsActive.HasValue) entity.IsActive = dto.IsActive.Value;
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _db.Entry(entity).Reference(c => c.Parent).LoadAsync();
        return Ok(ToDto(entity));
    }

    // ─── DELETE /api/categories/{id} ─────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var clinicId = GetClinicId();
        var entity = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id);
        if (entity == null) return NotFound(new { message = "Categoria não encontrada." });
        if (clinicId != Guid.Empty && entity.ClinicId != clinicId)
            return NotFound(new { message = "Categoria não encontrada." });

        // Se a categoria for PROFESSIONAL, desvincula especialidades antes de remover.
        if (entity.Type == "PROFESSIONAL")
        {
            var children = await _db.Categories.Where(c => c.ParentId == entity.Id).ToListAsync();
            foreach (var child in children) child.ParentId = null;
        }

        _db.Categories.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
