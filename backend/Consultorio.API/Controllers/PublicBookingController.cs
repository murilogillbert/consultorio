using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicBookingController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicBookingController(AppDbContext db) => _db = db;

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
        var service = await _db.Services.FindAsync(dto.ServiceId);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        // Verifica se o profissional existe
        var professional = await _db.Professionals.FindAsync(dto.ProfessionalId);
        if (professional == null)
            return NotFound(new { message = "Profissional não encontrado." });

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

        // Localiza ou cria o User/Patient
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        bool isNewUser = user == null;

        if (isNewUser)
        {
            // Novo paciente: senha é obrigatória
            if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
                return BadRequest(new { message = "Crie uma senha de acesso com pelo menos 6 caracteres para acompanhar suas consultas." });

            user = new User
            {
                Id           = Guid.NewGuid(),
                Name         = dto.Name.Trim(),
                Email        = email,
                Phone        = dto.Phone?.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                IsActive     = true,
                CreatedAt    = DateTime.UtcNow,
            };
            _db.Users.Add(user);
        }

        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.UserId == user!.Id);
        if (patient == null)
        {
            patient = new Patient
            {
                Id        = Guid.NewGuid(),
                ClinicId  = clinic.Id,
                UserId    = user!.Id,
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
    public Guid ProfessionalId  { get; set; }
    public DateTime StartTime   { get; set; }
    public DateTime EndTime     { get; set; }
    public string? Notes        { get; set; }
}
