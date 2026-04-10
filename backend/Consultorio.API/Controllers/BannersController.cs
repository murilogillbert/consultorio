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
public class BannersController : ControllerBase
{
    private readonly AppDbContext _db;
    public BannersController(AppDbContext db) => _db = db;

    private Guid GetClinicId()
    {
        var claim = User.FindFirst("clinicId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    // ─── GET /api/banners ─────────────────────────────────────────────
    // Público (homepage usa banners ativos)
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<BannerResponseDto>>> GetAll([FromQuery] bool? activeOnly)
    {
        IQueryable<Banner> query = _db.Banners;

        if (activeOnly == true)
            query = query.Where(b => b.IsActive);

        var list = await query
            .OrderBy(b => b.Order)
            .ThenByDescending(b => b.CreatedAt)
            .Select(b => new BannerResponseDto
            {
                Id = b.Id,
                Title = b.Title,
                Description = b.Description,
                ImageUrl = b.ImageUrl,
                Link = b.Link,
                Order = b.Order,
                IsActive = b.IsActive,
                CreatedAt = b.CreatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // ─── GET /api/banners/{id} ────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<ActionResult<BannerResponseDto>> GetById(Guid id)
    {
        var b = await _db.Banners.FindAsync(id);
        if (b == null) return NotFound(new { message = "Banner não encontrado." });

        return Ok(new BannerResponseDto
        {
            Id = b.Id,
            Title = b.Title,
            Description = b.Description,
            ImageUrl = b.ImageUrl,
            Link = b.Link,
            Order = b.Order,
            IsActive = b.IsActive,
            CreatedAt = b.CreatedAt
        });
    }

    // ─── POST /api/banners ────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<BannerResponseDto>> Create([FromBody] CreateBannerDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não está vinculado a nenhuma clínica." });

        var b = new Banner
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Title = dto.Title,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            Link = dto.Link,
            Order = dto.Order,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Banners.Add(b);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = b.Id }, new BannerResponseDto
        {
            Id = b.Id,
            Title = b.Title,
            Description = b.Description,
            ImageUrl = b.ImageUrl,
            Link = b.Link,
            Order = b.Order,
            IsActive = b.IsActive,
            CreatedAt = b.CreatedAt
        });
    }

    // ─── PUT /api/banners/{id} ────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<ActionResult<BannerResponseDto>> Update(Guid id, [FromBody] UpdateBannerDto dto)
    {
        var b = await _db.Banners.FindAsync(id);
        if (b == null) return NotFound(new { message = "Banner não encontrado." });

        if (dto.Title != null) b.Title = dto.Title;
        if (dto.Description != null) b.Description = dto.Description;
        if (dto.ImageUrl != null) b.ImageUrl = dto.ImageUrl;
        if (dto.Link != null) b.Link = dto.Link;
        if (dto.Order.HasValue) b.Order = dto.Order.Value;
        if (dto.IsActive.HasValue) b.IsActive = dto.IsActive.Value;
        b.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new BannerResponseDto
        {
            Id = b.Id,
            Title = b.Title,
            Description = b.Description,
            ImageUrl = b.ImageUrl,
            Link = b.Link,
            Order = b.Order,
            IsActive = b.IsActive,
            CreatedAt = b.CreatedAt
        });
    }

    // ─── DELETE /api/banners/{id} ─────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var b = await _db.Banners.FindAsync(id);
        if (b == null) return NotFound(new { message = "Banner não encontrado." });

        _db.Banners.Remove(b);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
