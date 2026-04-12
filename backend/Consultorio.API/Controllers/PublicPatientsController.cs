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
/// Permite que pacientes se cadastrem, façam login via OTP e consultem seus dados.
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
            Id           = Guid.NewGuid(),
            Name         = dto.Name.Trim(),
            Email        = email,
            Phone        = dto.Phone?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow,
        };

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

        return Ok(new { message = "Cadastro realizado com sucesso!", email = user.Email });
    }

    // ─── POST /api/public/patients/otp/request ────────────────────────────────
    [HttpPost("otp/request")]
    [AllowAnonymous]
    public async Task<ActionResult> RequestOtp([FromBody] OtpRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Email é obrigatório." });

        var email = dto.Email.ToLower().Trim();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user != null)
        {
            var isPatient = await _db.Patients.AnyAsync(p => p.UserId == user.Id);
            if (isPatient)
            {
                var otp = new Random().Next(100000, 999999).ToString();
                user.OtpCode   = otp;
                user.OtpExpiry = DateTime.UtcNow.AddMinutes(10);
                await _db.SaveChangesAsync();

                await TrySendOtpEmailAsync(email, user.Name, otp);
            }
        }

        // Sempre retorna 200 para não revelar se o email está cadastrado
        return Ok(new { message = "Se o e-mail estiver cadastrado, você receberá o código em breve." });
    }

    // ─── POST /api/public/patients/otp/verify ─────────────────────────────────
    [HttpPost("otp/verify")]
    [AllowAnonymous]
    public async Task<ActionResult> VerifyOtp([FromBody] OtpVerifyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Otp))
            return BadRequest(new { message = "Email e código são obrigatórios." });

        var email = dto.Email.ToLower().Trim();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        var patient = user != null
            ? await _db.Patients.FirstOrDefaultAsync(p => p.UserId == user.Id)
            : null;

        if (user == null || patient == null ||
            user.OtpCode != dto.Otp.Trim() ||
            user.OtpExpiry == null || user.OtpExpiry < DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Código inválido ou expirado." });
        }

        // Invalida OTP após uso
        user.OtpCode   = null;
        user.OtpExpiry = null;
        await _db.SaveChangesAsync();

        var token = _tokenService.GeneratePatientToken(user.Id, user.Email, patient.Id);

        return Ok(new
        {
            token,
            user = new { id = patient.Id, name = user.Name, email = user.Email }
        });
    }

    // ─── GET /api/public/patients/appointments ────────────────────────────────
    // Requer JWT de paciente (role = PATIENT com claim patientId)
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

    // ─── Envio de email (com fallback para console) ───────────────────────────
    private async Task TrySendOtpEmailAsync(string toEmail, string name, string otp)
    {
        var host = _config["Smtp:Host"];

        if (string.IsNullOrEmpty(host))
        {
            // SMTP não configurado — loga no console para debug
            Console.WriteLine($"[OTP] {toEmail} → código: {otp} (expira em 10 min)");
            return;
        }

        try
        {
            var port     = int.Parse(_config["Smtp:Port"] ?? "587");
            var user     = _config["Smtp:Username"] ?? "";
            var pass     = _config["Smtp:Password"] ?? "";
            var fromAddr = _config["Smtp:From"] ?? user;

            var body = $"Olá, {name}!\n\n" +
                       $"Seu código de acesso ao portal é: {otp}\n\n" +
                       $"Este código expira em 10 minutos.\n\n" +
                       $"Equipe Psicologia e Existir";

            using var smtp = new SmtpClient(host, port)
            {
                EnableSsl   = true,
                Credentials = new System.Net.NetworkCredential(user, pass)
            };
            var mail = new MailMessage(fromAddr, toEmail, "Código de Acesso - Portal do Paciente", body);
            await smtp.SendMailAsync(mail);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[OTP] Falha ao enviar email para {toEmail}: {ex.Message}");
            Console.WriteLine($"[OTP] Código gerado: {otp}");
        }
    }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

public class PublicRegisterPatientDto
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? CPF { get; set; }
    public string? Phone { get; set; }
}

public class OtpRequestDto
{
    public string Email { get; set; } = null!;
}

public class OtpVerifyDto
{
    public string Email { get; set; } = null!;
    public string Otp { get; set; } = null!;
}

public class SendPatientMessageDto
{
    public string Content { get; set; } = null!;
}
