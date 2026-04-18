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
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PatientsController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    private static PatientResponseDto ToDto(Patient p) => new()
    {
        Id = p.Id,
        UserId = p.UserId,
        Name = p.User.Name,
        Email = p.User.Email,
        CPF = p.CPF,
        Phone = p.Phone,
        BirthDate = p.BirthDate,
        Address = p.Address,
        City = p.City,
        State = p.State,
        Notes = p.Notes,
        IsActive = p.IsActive,
        CreatedAt = p.CreatedAt
    };

    // GET /api/patients?q=busca
    [HttpGet]
    public async Task<ActionResult<List<PatientResponseDto>>> GetAll([FromQuery] string? q)
    {
        var clinicId = GetClinicId();
        IQueryable<Patient> query = _db.Patients
            .Include(p => p.User)
            .Where(p => p.ClinicId == clinicId);

        // Filtro por nome, CPF ou email
        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = q.ToLower();
            query = query.Where(p =>
                p.User.Name.ToLower().Contains(search) ||
                p.User.Email.ToLower().Contains(search) ||
                (p.CPF != null && p.CPF.Contains(search))
            );
        }

        var patients = await query.OrderBy(p => p.User.Name).ToListAsync();
        return Ok(patients.Select(ToDto));
    }

    // GET /api/patients/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<PatientResponseDto>> GetById(Guid id)
    {
        var patient = await _db.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (patient == null)
            return NotFound(new { message = "Paciente não encontrado." });

        return Ok(ToDto(patient));
    }

    // POST /api/patients — cria User + Patient
    [HttpPost]
    public async Task<ActionResult<PatientResponseDto>> Create([FromBody] CreatePatientDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não vinculado a uma clínica." });

        // Verifica email duplicado
        if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
            return Conflict(new { message = "Email já cadastrado." });

        var generatedPassword = GenerateDefaultPassword(dto.Name);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(generatedPassword),
            Phone = dto.Phone,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            UserId = user.Id,
            CPF = dto.CPF,
            Phone = dto.Phone,
            BirthDate = dto.BirthDate,
            Address = dto.Address,
            Notes = dto.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        _db.Patients.Add(patient);
        await _db.SaveChangesAsync();

        patient.User = user;
        var response = ToDto(patient);
        response.GeneratedPassword = generatedPassword;
        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, response);
    }

    // DELETE /api/patients/{id}
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient == null)
            return NotFound(new { message = "Paciente não encontrado." });

        var hasActive = await _db.Appointments
            .AnyAsync(a => a.PatientId == id && a.Status != "CANCELLED");
        if (hasActive)
            return Conflict(new { message = "Paciente possui consultas ativas. Cancele-as antes de remover." });

        _db.Patients.Remove(patient);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /api/patients/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<PatientResponseDto>> Update(Guid id, [FromBody] UpdatePatientDto dto)
    {
        var patient = await _db.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (patient == null)
            return NotFound(new { message = "Paciente não encontrado." });

        if (dto.Name != null) patient.User.Name = dto.Name;
        if (dto.CPF != null) patient.CPF = dto.CPF;
        if (dto.Phone != null) patient.Phone = dto.Phone;
        if (dto.BirthDate.HasValue) patient.BirthDate = dto.BirthDate.Value;
        if (dto.Address != null) patient.Address = dto.Address;
        if (dto.City != null) patient.City = dto.City;
        if (dto.State != null) patient.State = dto.State;
        if (dto.PostalCode != null) patient.PostalCode = dto.PostalCode;
        if (dto.Notes != null) patient.Notes = dto.Notes;
        patient.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ToDto(patient));
    }

    private static string GenerateDefaultPassword(string name)
    {
        var cleaned = new string((name ?? string.Empty).Where(char.IsLetter).ToArray());
        var prefix = cleaned.Length > 0
            ? cleaned[..Math.Min(4, cleaned.Length)]
            : "pac";

        return $"{prefix.ToLowerInvariant()}123!";
    }
}
