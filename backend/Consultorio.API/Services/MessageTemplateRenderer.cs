using System.Globalization;
using Consultorio.API.Controllers;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;
using Microsoft.EntityFrameworkCore;

namespace Consultorio.API.Services;

/// <summary>
/// Resolve placeholders ({nome}, {servico}, {data}, {hora}, {profissional})
/// em templates de mensagem. Usa o Patient + Appointment para preencher os
/// valores; campos sem dado correspondente ficam com placeholder vazio.
/// </summary>
public class MessageTemplateRenderer
{
    private readonly AppDbContext _db;

    public MessageTemplateRenderer(AppDbContext db) => _db = db;

    public async Task<RenderResult> RenderAsync(Guid clinicId, string kind, Guid patientId, Guid? appointmentId)
    {
        var normalizedKind = kind.ToUpperInvariant();
        if (!MessageTemplatesController.KindDefaults.ContainsKey(normalizedKind))
            throw new ArgumentException($"Tipo de template inválido: {kind}", nameof(kind));

        var stored = await _db.MessageTemplates
            .FirstOrDefaultAsync(t => t.ClinicId == clinicId && t.Kind == normalizedKind);
        var body = stored?.Body ?? MessageTemplatesController.KindDefaults[normalizedKind];

        var patient = await _db.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == patientId && p.ClinicId == clinicId)
            ?? throw new InvalidOperationException("Paciente não encontrado.");

        // Resolve appointment: explicit id > closest future > most recent past.
        Appointment? appt = null;
        if (appointmentId.HasValue)
        {
            appt = await LoadAppointmentAsync(clinicId, appointmentId.Value);
            if (appt == null || appt.PatientId != patientId)
                throw new InvalidOperationException("Agendamento informado não pertence ao paciente.");
        }
        else
        {
            var now = DateTime.UtcNow;
            appt = await _db.Appointments
                .Include(a => a.Service)
                .Include(a => a.Professional).ThenInclude(p => p.User)
                .Where(a => a.ClinicId == clinicId
                            && a.PatientId == patientId
                            && a.Status != "CANCELLED"
                            && a.StartTime >= now)
                .OrderBy(a => a.StartTime)
                .FirstOrDefaultAsync();

            appt ??= await _db.Appointments
                .Include(a => a.Service)
                .Include(a => a.Professional).ThenInclude(p => p.User)
                .Where(a => a.ClinicId == clinicId
                            && a.PatientId == patientId
                            && a.Status != "CANCELLED")
                .OrderByDescending(a => a.StartTime)
                .FirstOrDefaultAsync();
        }

        var ctx = BuildContext(patient, appt);
        var rendered = ApplyVariables(body, ctx);

        return new RenderResult(normalizedKind, body, rendered, appt);
    }

    private async Task<Appointment?> LoadAppointmentAsync(Guid clinicId, Guid appointmentId) =>
        await _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(a => a.Id == appointmentId && a.ClinicId == clinicId);

    private static IReadOnlyDictionary<string, string> BuildContext(Patient patient, Appointment? appt)
    {
        var ptBR = CultureInfo.GetCultureInfo("pt-BR");
        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["nome"]         = patient.User?.Name ?? string.Empty,
            ["servico"]      = appt?.Service?.Name ?? string.Empty,
            ["data"]         = appt != null ? appt.StartTime.ToString("dd/MM/yyyy", ptBR) : string.Empty,
            ["hora"]         = appt != null ? appt.StartTime.ToString("HH:mm", ptBR) : string.Empty,
            ["profissional"] = appt?.Professional?.User?.Name ?? string.Empty,
        };
    }

    private static string ApplyVariables(string body, IReadOnlyDictionary<string, string> ctx)
    {
        // Handle {var} (no spaces) — keep regex out for clarity & predictability.
        var sb = new System.Text.StringBuilder(body.Length + 32);
        for (int i = 0; i < body.Length; i++)
        {
            if (body[i] == '{')
            {
                int close = body.IndexOf('}', i + 1);
                if (close > i + 1)
                {
                    var name = body.Substring(i + 1, close - i - 1).Trim();
                    if (ctx.TryGetValue(name, out var value))
                    {
                        sb.Append(value);
                        i = close;
                        continue;
                    }
                }
            }
            sb.Append(body[i]);
        }
        return sb.ToString();
    }

    public record RenderResult(string Kind, string Body, string Rendered, Appointment? Appointment);
}
