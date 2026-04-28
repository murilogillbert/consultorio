using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicBookingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public PublicBookingController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private Guid? TryExtractPatientId(string? bearerHeader)
    {
        if (string.IsNullOrWhiteSpace(bearerHeader) ||
            !bearerHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;

        var token = bearerHeader[7..].Trim();
        try
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
            var principal = new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true, ValidIssuer = _config["Jwt:Issuer"],
                ValidateAudience = true, ValidAudience = _config["Jwt:Audience"],
                ValidateLifetime = true,
                IssuerSigningKey = key,
            }, out _);
            var patientIdStr = principal.FindFirst("patientId")?.Value;
            return Guid.TryParse(patientIdStr, out var id) ? id : null;
        }
        catch { return null; }
    }

    // POST /api/public/book
    // Agendamento público: localiza ou cria paciente e cria a consulta.
    [HttpPost("book")]
    public async Task<ActionResult> Book([FromBody] PublicBookingDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Nome e e-mail são obrigatórios." });

        var email = dto.Email.ToLower().Trim();

        // Busca a clínica (single-tenant)
        var clinic = await _db.Clinics.FirstOrDefaultAsync();
        if (clinic == null)
            return StatusCode(503, new { message = "Sistema ainda não configurado." });

        // Busca o serviço
        var service = await _db.Services
            .Include(s => s.ServiceInsurancePlans)
            .Include(s => s.Professionals).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(s => s.Id == dto.ServiceId && s.IsActive && s.OnlineBooking);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        if (service.ServiceInsurancePlans.Count > 0 && !dto.InsurancePlanId.HasValue)
            return BadRequest(new { message = "Selecione um convênio para continuar." });

        if (dto.InsurancePlanId.HasValue)
        {
            var selectedInsurance = service.ServiceInsurancePlans
                .FirstOrDefault(sip => sip.InsurancePlanId == dto.InsurancePlanId.Value);

            if (selectedInsurance == null)
                return BadRequest(new { message = "O convênio selecionado não está disponível para este serviço." });
        }

        // Verifica se o profissional existe
        var professional = service.Professionals
            .FirstOrDefault(p => p.Id == dto.ProfessionalId && p.IsAvailable && p.User.IsActive);
        if (professional == null)
            return BadRequest(new { message = "Profissional não habilitado para este serviço." });

        // Calcula EndTime a partir da duração do serviço (ignora o endTime do cliente)
        var endTime = dto.StartTime.AddMinutes(service.DurationMinutes);

        // Verifica conflito de horário
        var conflict = await _db.Appointments.AnyAsync(a =>
            a.ProfessionalId == dto.ProfessionalId &&
            a.Status != "CANCELLED" &&
            a.StartTime < endTime &&
            a.EndTime > dto.StartTime);

        if (conflict)
            return Conflict(new { message = "Este horário não está mais disponível. Por favor, escolha outro horário." });

        // Se o frontend enviou um token de paciente, reutiliza a conta existente.
        // Caso contrário, sempre cria novo usuário — isso permite agendar dependentes
        // com o mesmo e-mail do responsável.
        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
        var patientIdFromToken = TryExtractPatientId(authHeader);

        Patient? patient = null;
        User? user = null;
        bool isNewUser = false;

        if (patientIdFromToken.HasValue)
        {
            patient = await _db.Patients
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == patientIdFromToken.Value);
            if (patient != null)
                user = patient.User;
        }

        if (patient == null)
        {
            var rawPassword = string.IsNullOrWhiteSpace(dto.Password) ? "123456" : dto.Password.Trim();
            user = new User
            {
                Id           = Guid.NewGuid(),
                Name         = dto.Name.Trim(),
                Email        = email,
                Phone        = dto.Phone?.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword),
                IsActive     = true,
                CreatedAt    = DateTime.UtcNow,
            };
            _db.Users.Add(user);
            isNewUser = true;

            patient = new Patient
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
        }

        // Cria o agendamento
        var appointment = new Appointment
        {
            Id             = Guid.NewGuid(),
            ClinicId       = clinic.Id,
            ServiceId      = dto.ServiceId,
            InsurancePlanId = dto.InsurancePlanId,
            PatientId      = patient.Id,
            ProfessionalId = dto.ProfessionalId,
            StartTime      = dto.StartTime,
            EndTime        = endTime,
            Status         = "SCHEDULED",
            Notes          = dto.Notes,
            CreatedAt      = DateTime.UtcNow,
        };
        _db.Appointments.Add(appointment);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message       = isNewUser
                ? "Agendamento realizado! Acesse 'Minhas Consultas' com seu e-mail e a senha que você criou."
                : "Agendamento realizado com sucesso!",
            appointmentId = appointment.Id,
            startTime     = appointment.StartTime,
            endTime       = appointment.EndTime,
            isNewUser,
        });
    }
}

public class PublicBookingDto
{
    public string Name          { get; set; } = null!;
    public string Email         { get; set; } = null!;
    public string? Password     { get; set; }
    public string? CPF          { get; set; }
    public string? Phone        { get; set; }
    public Guid ServiceId       { get; set; }
    public Guid? InsurancePlanId { get; set; }
    public Guid ProfessionalId  { get; set; }
    public DateTime StartTime   { get; set; }
    public DateTime EndTime     { get; set; }
    public string? Notes        { get; set; }
}
