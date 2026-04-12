using System.Net.Mail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;
using Consultorio.API.Services;

namespace Consultorio.API.Controllers;

/// <summary>
/// Endpoints públicos para o portal do paciente (sem autenticação de staff).
/// Permite que pacientes se cadastrem, façam login com senha e consultem seus dados.
/// </summary>
[ApiController]
[Route("api/public/patients")]
public class PublicPatientsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;
    private readonly IConfiguration _config;

    public PublicPatientsController(AppDbContext db, TokenService tokenService, IConfiguration config)
    {
        _db = db;
        _tokenService = tokenService;
        _config = config;
    }

    // ─── POST /api/public/patients/register ───────────────────────────────────
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult> Register([FromBody] PublicRegisterPatientDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Nome e e-mail são obrigatórios." });

        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
            return BadRequest(new { message = "A senha deve ter no mínimo 6 caracteres." });

        var email = dto.Email.ToLower().Trim();
        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (existingUser != null)
        {
            var existingPatient = await _db.Patients.FirstOrDefaultAsync(p => p.UserId == existingUser.Id);
            if (existingPatient != null)
                return Conflict(new { message = "Este e-mail já possui cadastro. Faça login para continuar." });
        }

        var clinic = await _db.Clinics.FirstOrDefaultAsync();
        if (clinic == null)
            return StatusCode(503, new { message = "Sistema ainda não configurado." });

        var user = existingUser ?? new User
        {
            Id        = Guid.NewGuid(),
            Name      = dto.Name.Trim(),
            Email     = email,
            Phone     = dto.Phone?.Trim(),
            IsActive  = true,
            CreatedAt = DateTime.UtcNow,
        };

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        if (existingUser == null)
            _db.Users.Add(user);

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

        return Ok(new { message = "Cadastro realizado com sucesso! Faça login para continuar.", email = user.Email });
    }

    // ─── POST /api/public/patients/login ──────────────────────────────────────
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult> Login([FromBody] PatientLoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "E-mail e senha são obrigatórios." });

        var email = dto.Email.ToLower().Trim();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        var patient = user != null
            ? await _db.Patients.FirstOrDefaultAsync(p => p.UserId == user.Id)
            : null;

        if (user == null || patient == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "E-mail ou senha incorretos." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Conta desativada. Entre em contato com a clínica." });

        var token = _tokenService.GeneratePatientToken(user.Id, user.Email, patient.Id);

        return Ok(new
        {
            token,
            user = new { id = patient.Id, name = user.Name, email = user.Email }
        });
    }

    // ─── GET /api/public/patients/appointments ────────────────────────────────
    [HttpGet("appointments")]
    [Authorize(Roles = "PATIENT")]
    public async Task<ActionResult> GetMyAppointments()
    {
        var patientIdStr = User.FindFirst("patientId")?.Value;
        if (!Guid.TryParse(patientIdStr, out var patientId))
            return Unauthorized(new { message = "Token inválido." });

        var appointments = await _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Where(a => a.PatientId == patientId)
            .OrderByDescending(a => a.StartTime)
            .Select(a => new
            {
                id           = a.Id,
                startTime    = a.StartTime,
                endTime      = a.EndTime,
                status       = a.Status,
                notes        = a.Notes,
                service      = new { name = a.Service.Name, duration = a.Service.DurationMinutes },
                professional = new { user = new { name = a.Professional.User.Name, avatarUrl = a.Professional.User.AvatarUrl } }
            })
            .ToListAsync();

        return Ok(appointments);
    }

    // ─── POST /api/public/patients/appointments/{id}/cancel ───────────────────
    [HttpPost("appointments/{id}/cancel")]
    [Authorize(Roles = "PATIENT")]
    public async Task<ActionResult> CancelAppointment(Guid id)
    {
        var patientIdStr = User.FindFirst("patientId")?.Value;
        if (!Guid.TryParse(patientIdStr, out var patientId))
            return Unauthorized(new { message = "Token inválido." });

        var appt = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == id && a.PatientId == patientId);
        if (appt == null)
            return NotFound(new { message = "Consulta não encontrada." });

        if (appt.Status == "CANCELLED")
            return BadRequest(new { message = "Esta consulta já foi cancelada." });

        if (appt.StartTime <= DateTime.UtcNow.AddHours(2))
            return BadRequest(new { message = "Consultas não podem ser canceladas com menos de 2 horas de antecedência." });

        appt.Status = "CANCELLED";
        appt.Notes = string.IsNullOrEmpty(appt.Notes)
            ? "[CANCELADO pelo paciente]"
            : $"[CANCELADO pelo paciente] {appt.Notes}";
        appt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ─── GET /api/public/patients/conversation ────────────────────────────────
    [HttpGet("conversation")]
    [Authorize(Roles = "PATIENT")]
    public async Task<ActionResult> GetConversation()
    {
        var patientIdStr = User.FindFirst("patientId")?.Value;
        if (!Guid.TryParse(patientIdStr, out var patientId))
            return Unauthorized(new { message = "Token inválido." });

        var messages = await _db.PatientMessages
            .Where(m => m.PatientId == patientId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                id        = m.Id,
                direction = m.Direction,
                content   = m.Content,
                isRead    = m.IsRead,
                createdAt = m.CreatedAt,
            })
            .ToListAsync();

        return Ok(new { messages });
    }

    // ─── POST /api/public/patients/message ────────────────────────────────────
    [HttpPost("message")]
    [Authorize(Roles = "PATIENT")]
    public async Task<ActionResult> SendMessage([FromBody] SendPatientMessageDto dto)
    {
        var patientIdStr = User.FindFirst("patientId")?.Value;
        if (!Guid.TryParse(patientIdStr, out var patientId))
            return Unauthorized(new { message = "Token inválido." });

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Mensagem não pode estar vazia." });

        var patient = await _db.Patients.FindAsync(patientId);
        if (patient == null) return NotFound(new { message = "Paciente não encontrado." });

        var msg = new PatientMessage
        {
            Id        = Guid.NewGuid(),
            PatientId = patientId,
            ClinicId  = patient.ClinicId,
            Content   = dto.Content.Trim(),
            Direction = "IN",
            IsRead    = false,
            CreatedAt = DateTime.UtcNow,
        };

        _db.PatientMessages.Add(msg);
        await _db.SaveChangesAsync();

        return Ok(new { id = msg.Id, direction = msg.Direction, content = msg.Content, isRead = msg.IsRead, createdAt = msg.CreatedAt });
    }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

public class PublicRegisterPatientDto
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string? CPF { get; set; }
    public string? Phone { get; set; }
}

public class PatientLoginDto
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
}

public class SendPatientMessageDto
{
    public string Content { get; set; } = null!;
}
