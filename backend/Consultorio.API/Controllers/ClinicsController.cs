using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.API.DTOs;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClinicsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ClinicsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/clinics
    [HttpGet]
    public async Task<ActionResult<List<ClinicResponseDto>>> GetAll()
    {
        var clinics = await _db.Clinics
            .Where(c => c.IsActive)
            .Select(c => new ClinicResponseDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                Phone = c.Phone,
                Email = c.Email,
                Address = c.Address,
                City = c.City,
                State = c.State,
                PostalCode = c.PostalCode,
                Website = c.Website,
                LogoUrl = c.LogoUrl,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(clinics);
    }

    // GET /api/clinics/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ClinicResponseDto>> GetById(Guid id)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "Clínica não encontrada." });

        return Ok(new ClinicResponseDto
        {
            Id = clinic.Id,
            Name = clinic.Name,
            Description = clinic.Description,
            Phone = clinic.Phone,
            Email = clinic.Email,
            Address = clinic.Address,
            City = clinic.City,
            State = clinic.State,
            PostalCode = clinic.PostalCode,
            Website = clinic.Website,
            LogoUrl = clinic.LogoUrl,
            IsActive = clinic.IsActive,
            CreatedAt = clinic.CreatedAt
        });
    }

    // POST /api/clinics
    [HttpPost]
    public async Task<ActionResult<ClinicResponseDto>> Create([FromBody] CreateClinicDto dto)
    {
        var clinic = new Clinic
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address,
            City = dto.City,
            State = dto.State,
            PostalCode = dto.PostalCode,
            Website = dto.Website,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Clinics.Add(clinic);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = clinic.Id }, new ClinicResponseDto
        {
            Id = clinic.Id,
            Name = clinic.Name,
            Description = clinic.Description,
            Phone = clinic.Phone,
            Email = clinic.Email,
            Address = clinic.Address,
            City = clinic.City,
            State = clinic.State,
            PostalCode = clinic.PostalCode,
            Website = clinic.Website,
            LogoUrl = clinic.LogoUrl,
            IsActive = clinic.IsActive,
            CreatedAt = clinic.CreatedAt
        });
    }

    // PUT /api/clinics/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<ClinicResponseDto>> Update(Guid id, [FromBody] UpdateClinicDto dto)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "Clínica não encontrada." });

        if (dto.Name != null) clinic.Name = dto.Name;
        if (dto.Description != null) clinic.Description = dto.Description;
        if (dto.Phone != null) clinic.Phone = dto.Phone;
        if (dto.Email != null) clinic.Email = dto.Email;
        if (dto.Address != null) clinic.Address = dto.Address;
        if (dto.City != null) clinic.City = dto.City;
        if (dto.State != null) clinic.State = dto.State;
        if (dto.PostalCode != null) clinic.PostalCode = dto.PostalCode;
        if (dto.Website != null) clinic.Website = dto.Website;
        if (dto.LogoUrl != null) clinic.LogoUrl = dto.LogoUrl;
        clinic.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new ClinicResponseDto
        {
            Id = clinic.Id,
            Name = clinic.Name,
            Description = clinic.Description,
            Phone = clinic.Phone,
            Email = clinic.Email,
            Address = clinic.Address,
            City = clinic.City,
            State = clinic.State,
            PostalCode = clinic.PostalCode,
            Website = clinic.Website,
            LogoUrl = clinic.LogoUrl,
            IsActive = clinic.IsActive,
            CreatedAt = clinic.CreatedAt
        });
    }
}
