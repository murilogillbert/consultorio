using System.Globalization;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;
using Microsoft.EntityFrameworkCore;

namespace Consultorio.API.Services;

public interface IAppointmentReminderService
{
    Task<int> ProcessDueAsync(CancellationToken ct);
}

public class AppointmentReminderService : IAppointmentReminderService
{
    private const string ReminderType = "T_MINUS_24H";
    private const string Channel = "EMAIL";

    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<AppointmentReminderService> _logger;

    private static readonly TimeZoneInfo BrazilTimeZone = ResolveBrazilTimeZone();

    public AppointmentReminderService(
        AppDbContext db,
        IEmailService emailService,
        ILogger<AppointmentReminderService> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<int> ProcessDueAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var windowEnd = now.AddHours(24);

        var due = await _db.Appointments
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Include(a => a.Service)
            .Include(a => a.Clinic)
            .Where(a => a.StartTime > now && a.StartTime <= windowEnd)
            .Where(a => a.Status == "SCHEDULED" || a.Status == "CONFIRMED")
            .Where(a => a.Clinic.RemindersEnabled)
            .Where(a => a.Patient.User.Email != null && a.Patient.User.Email != "")
            .Where(a => !_db.AppointmentReminderLogs.Any(r =>
                r.AppointmentId == a.Id &&
                r.ReminderType == ReminderType &&
                r.Status == "SENT"))
            .ToListAsync(ct);

        if (due.Count == 0) return 0;

        var sentCount = 0;
        foreach (var appointment in due)
        {
            ct.ThrowIfCancellationRequested();
            if (await TrySendAsync(appointment, ct))
                sentCount++;
        }

        return sentCount;
    }

    private async Task<bool> TrySendAsync(Appointment appointment, CancellationToken ct)
    {
        var clinic = appointment.Clinic;
        var patientEmail = appointment.Patient.User.Email;
        var subject = "Lembrete: sua consulta é amanhã";
        var html = BuildHtml(appointment);

        var (smtpOverride, resendOverride) = ResolveOverrides(clinic);

        try
        {
            await _emailService.SendAsync(patientEmail, subject, html, smtpOverride, resendOverride);

            _db.AppointmentReminderLogs.Add(new AppointmentReminderLog
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                ClinicId = clinic.Id,
                Channel = Channel,
                ReminderType = ReminderType,
                Status = "SENT",
                SentAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync(ct);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Falha ao enviar lembrete de consulta. AppointmentId={AppointmentId}, ClinicId={ClinicId}, To={Email}",
                appointment.Id, clinic.Id, patientEmail);

            var message = ex.Message ?? "unknown error";
            if (message.Length > 500) message = message[..500];

            _db.AppointmentReminderLogs.Add(new AppointmentReminderLog
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                ClinicId = clinic.Id,
                Channel = Channel,
                ReminderType = ReminderType,
                Status = "FAILED",
                ErrorMessage = message,
                SentAt = DateTime.UtcNow,
            });
            try { await _db.SaveChangesAsync(ct); }
            catch (Exception logEx)
            {
                _logger.LogError(logEx, "Falha ao gravar AppointmentReminderLog de erro");
            }
            return false;
        }
    }

    private static (SmtpOverride? smtp, ResendOverride? resend) ResolveOverrides(Clinic clinic)
    {
        // Mesma lógica de AuthController.ForgotPassword: Resend tem prioridade,
        // SMTP é fallback. Sem nenhum dos dois, EmailService cai no appsettings global.
        if (!string.IsNullOrWhiteSpace(clinic.ResendApiKey) &&
            !string.IsNullOrWhiteSpace(clinic.ResendFromEmail))
        {
            return (null, new ResendOverride(
                clinic.ResendApiKey!,
                clinic.ResendFromEmail!,
                clinic.ResendFromName));
        }

        if (!string.IsNullOrWhiteSpace(clinic.SmtpHost) &&
            !string.IsNullOrWhiteSpace(clinic.SmtpPassword))
        {
            return (new SmtpOverride(
                clinic.SmtpHost!,
                clinic.SmtpPort ?? 587,
                clinic.SmtpUsername ?? "",
                clinic.SmtpPassword!,
                clinic.SmtpFrom ?? clinic.SmtpUsername ?? ""), null);
        }

        return (null, null);
    }

    private static string BuildHtml(Appointment appointment)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(appointment.StartTime, DateTimeKind.Utc),
            BrazilTimeZone);
        var ptBr = CultureInfo.GetCultureInfo("pt-BR");
        var dateStr = local.ToString("dd/MM/yyyy", ptBr);
        var timeStr = local.ToString("HH:mm", ptBr);

        var patientFirstName = FirstName(appointment.Patient.User.Name);
        var professionalName = appointment.Professional.User?.Name ?? "";
        var serviceName = appointment.Service?.Name ?? "";
        var modality = appointment.AppointmentType == "ONLINE" ? "Online" : "Presencial";
        var clinicName = appointment.Clinic.Name;

        return $@"
            <h2>Lembrete da sua consulta</h2>
            <p>Olá {System.Net.WebUtility.HtmlEncode(patientFirstName)},</p>
            <p>Este é um lembrete da sua consulta agendada para <strong>amanhã</strong>:</p>
            <ul>
              <li><strong>Data:</strong> {dateStr}</li>
              <li><strong>Horário:</strong> {timeStr} (horário de Brasília)</li>
              <li><strong>Profissional:</strong> {System.Net.WebUtility.HtmlEncode(professionalName)}</li>
              <li><strong>Serviço:</strong> {System.Net.WebUtility.HtmlEncode(serviceName)}</li>
              <li><strong>Modalidade:</strong> {modality}</li>
            </ul>
            <p>Caso precise remarcar ou cancelar, entre em contato com a clínica.</p>
            <p style=""color:#666;font-size:12px"">{System.Net.WebUtility.HtmlEncode(clinicName)}</p>";
    }

    private static string FirstName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return "";
        var space = fullName.IndexOf(' ');
        return space > 0 ? fullName[..space] : fullName;
    }

    private static TimeZoneInfo ResolveBrazilTimeZone()
    {
        // Windows usa "E. South America Standard Time"; Linux/macOS usam IANA "America/Sao_Paulo".
        foreach (var id in new[] { "America/Sao_Paulo", "E. South America Standard Time" })
        {
            if (TimeZoneInfo.TryFindSystemTimeZoneById(id, out var tz))
                return tz;
        }
        return TimeZoneInfo.CreateCustomTimeZone("BRT-Fallback", TimeSpan.FromHours(-3), "BRT", "BRT");
    }
}
