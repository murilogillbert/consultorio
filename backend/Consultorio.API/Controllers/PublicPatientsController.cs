using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

/// <summary>
/// Endpoints públicos para o portal do paciente (sem autenticação de staff).
/// Permite que pacientes se cadastrem e façam login via OTP.
/// </summary>
[ApiController]
[Route("api/public/patients")]
[AllowAnonymous]
public class PublicPatientsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicPatientsController(AppDbContext db) => _db = db;

    // ─── POST /api/public/patients/register ───────────────────────────
    // Cadastra um novo paciente. Se o e-mail já existir, retorna conflito.
    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] PublicRegisterPatientDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Nome e e-mail são obrigatórios." });

        // Verifica se o email já está cadastrado como paciente
        var existingUser = await _db.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower().Trim());

        if (existingUser != null)
        {
            var existingPatient = await _db.Patients
                .FirstOrDefaultAsync(p => p.UserId == existingUser.Id);
            if (existingPatient != null)
                return Conflict(new { message = "Este e-mail já possui cadastro. Faça login para continuar." });
        }

        // Pega a primeira clínica (sistema single-tenant)
        var clinic = await _db.Clinics.FirstOrDefaultAsync();
        if (clinic == null)
            return StatusCode(503, new { message = "Sistema ainda não configurado." });

        // Cria o User base (pacientes não precisam de senha para o portal OTP)
        var user = existingUser ?? new User
        {
            Id           = Guid.NewGuid(),
            Name         = dto.Name.Trim(),
            Email        = dto.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()), // senha aleatória
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow,
        };

        if (existingUser == null)
        {
            if (dto.Phone != null) user.Phone = dto.Phone.Trim();
            _db.Users.Add(user);
        }

        // Cria o registro de Paciente
        var patient = new Patient
        {
            Id        = Guid.NewGuid(),
            ClinicId  = clinic.Id,
            UserId    = user.Id,
            CPF       = dto.CPF?.Trim(),
            Phone     = dto.Phone?.Trim(),
            IsActive  = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Patients.Add(patient);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Cadastro realizado com sucesso! Use seu e-mail para acessar o portal.",
            email   = user.Email,
        });
    }
}

public class PublicRegisterPatientDto
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? CPF { get; set; }
    public string? Phone { get; set; }
}
