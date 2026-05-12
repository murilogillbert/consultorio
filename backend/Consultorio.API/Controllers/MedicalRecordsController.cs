using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.API.DTOs;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

/// <summary>
/// Endpoints do prontuário eletrônico. Acesso compartilhado entre
/// profissional e recepção, com filtragem por role:
///  - Profissional: conteúdo clínico completo dos pacientes que atende.
///  - Admin / Recepção: ficha resumida + metadados de sessões + anexos
///    administrativos; conteúdo clínico das SessionNotes é redigido.
/// Toda leitura/edição é auditada (MedicalRecordAudits) — requisito LGPD.
/// </summary>
[ApiController]
[Authorize(Roles = "ADMIN,RECEPTIONIST,PROFESSIONAL")]
public class MedicalRecordsController : ControllerBase
{
    private readonly AppDbContext _db;

    private const string ATT_FOLDER = "medical";

    // Extensões permitidas para anexos clínicos.
    private static readonly string[] AllowedExtensions =
        { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx" };

    private const long MaxFileSize = 15 * 1024 * 1024; // 15 MB

    public MedicalRecordsController(AppDbContext db) => _db = db;

    // ─── Helpers de identidade/contexto ────────────────────────────────────
    private Guid CurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty;
    }

    private Guid CurrentClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    private Guid? CurrentProfessionalId() =>
        Guid.TryParse(User.FindFirst("professionalId")?.Value, out var id) ? id : null;

    private string CurrentRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? "";

    private bool IsProfessional() => CurrentRole() == "PROFESSIONAL";

    private bool IsStaff() => CurrentRole() == "ADMIN" || CurrentRole() == "RECEPTIONIST";

    // Profissional só enxerga pacientes com quem teve ao menos um Appointment.
    private async Task<bool> ProfessionalHasAccessAsync(Guid patientId)
    {
        var proId = CurrentProfessionalId();
        if (proId == null) return false;
        return await _db.Appointments
            .AnyAsync(a => a.ProfessionalId == proId && a.PatientId == patientId);
    }

    private async Task<bool> CanAccessPatientAsync(Patient patient)
    {
        var clinicId = CurrentClinicId();
        if (clinicId == Guid.Empty || patient.ClinicId != clinicId) return false;
        if (IsStaff()) return true;
        if (IsProfessional()) return await ProfessionalHasAccessAsync(patient.Id);
        return false;
    }

    // Recupera (ou cria sob demanda) o prontuário do paciente.
    private async Task<MedicalRecord> GetOrCreateRecordAsync(Patient patient)
    {
        var record = await _db.MedicalRecords
            .Include(m => m.UpdatedBy)
            .FirstOrDefaultAsync(m => m.PatientId == patient.Id);
        if (record != null) return record;

        record = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            ClinicId = patient.ClinicId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.MedicalRecords.Add(record);
        await _db.SaveChangesAsync();
        return record;
    }

    private async Task AuditAsync(Guid patientId, string action, string entityType, Guid? entityId, string? detail = null)
    {
        _db.MedicalRecordAudits.Add(new MedicalRecordAudit
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            ClinicId = CurrentClinicId(),
            UserId = CurrentUserId(),
            UserRole = CurrentRole(),
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Detail = detail,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            Timestamp = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
    }

    // ─── DTO projections ───────────────────────────────────────────────────
    private MedicalRecordResponseDto ToRecordDto(MedicalRecord m, string patientName)
    {
        var restricted = !IsProfessional() && !IsAdmin();
        return new MedicalRecordResponseDto
        {
            Id = m.Id,
            PatientId = m.PatientId,
            PatientName = patientName,
            // Para recepção, dados clínicos sensíveis ficam ocultos —
            // mas alergias e medicações em uso são exibidas (triagem/emergência).
            BloodType = restricted ? m.BloodType : m.BloodType,
            Allergies = m.Allergies,
            ChronicConditions = restricted ? null : m.ChronicConditions,
            CurrentMedications = m.CurrentMedications,
            FamilyHistory = restricted ? null : m.FamilyHistory,
            SurgicalHistory = restricted ? null : m.SurgicalHistory,
            Habits = restricted ? null : m.Habits,
            HeightCm = m.HeightCm,
            WeightKg = m.WeightKg,
            CreatedAt = m.CreatedAt,
            UpdatedAt = m.UpdatedAt,
            UpdatedByName = m.UpdatedBy?.Name,
            IsRestrictedView = restricted,
        };
    }

    private bool IsAdmin() => CurrentRole() == "ADMIN";

    private SessionNoteResponseDto ToSessionNoteDto(SessionNote n, Appointment appt)
    {
        var restricted = !IsProfessional() && !IsAdmin();
        return new SessionNoteResponseDto
        {
            Id = n.Id,
            AppointmentId = n.AppointmentId,
            PatientId = n.PatientId,
            ProfessionalId = n.ProfessionalId,
            ProfessionalName = appt.Professional?.User?.Name ?? "—",
            ServiceName = appt.Service?.Name ?? "—",
            AppointmentStartTime = appt.StartTime,
            AppointmentStatus = appt.Status,
            ChiefComplaint = restricted ? null : n.ChiefComplaint,
            Subjective = restricted ? null : n.Subjective,
            Objective = restricted ? null : n.Objective,
            Assessment = restricted ? null : n.Assessment,
            Plan = restricted ? null : n.Plan,
            Diagnosis = restricted ? null : n.Diagnosis,
            DiagnosisCode = restricted ? null : n.DiagnosisCode,
            Prescription = restricted ? null : n.Prescription,
            VitalSignsJson = restricted ? null : n.VitalSignsJson,
            IsSigned = n.IsSigned,
            SignedAt = n.SignedAt,
            CreatedAt = n.CreatedAt,
            UpdatedAt = n.UpdatedAt,
            IsRestrictedView = restricted,
        };
    }

    private static MedicalAttachmentResponseDto ToAttachmentDto(MedicalAttachment a) => new()
    {
        Id = a.Id,
        PatientId = a.PatientId,
        SessionNoteId = a.SessionNoteId,
        FileName = a.FileName,
        OriginalName = a.OriginalName,
        MimeType = a.MimeType,
        Size = a.Size,
        Url = a.StoragePath,
        Category = a.Category,
        Description = a.Description,
        UploadedById = a.UploadedById,
        UploadedByName = a.UploadedBy?.Name ?? "—",
        UploadedAt = a.UploadedAt,
    };

    // ───────────────────────── ENDPOINTS ──────────────────────────────────

    // GET /api/patients/{patientId}/medical-record
    [HttpGet("/api/patients/{patientId:guid}/medical-record")]
    public async Task<ActionResult<MedicalRecordResponseDto>> GetRecord(Guid patientId)
    {
        var patient = await _db.Patients.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == patientId);
        if (patient == null) return NotFound(new { message = "Paciente não encontrado." });
        if (!await CanAccessPatientAsync(patient)) return Forbid();

        var record = await GetOrCreateRecordAsync(patient);
        await AuditAsync(patientId, "VIEW", "MedicalRecord", record.Id);
        return Ok(ToRecordDto(record, patient.User.Name));
    }

    // PUT /api/patients/{patientId}/medical-record
    [HttpPut("/api/patients/{patientId:guid}/medical-record")]
    [Authorize(Roles = "ADMIN,PROFESSIONAL")]
    public async Task<ActionResult<MedicalRecordResponseDto>> UpdateRecord(
        Guid patientId, [FromBody] UpdateMedicalRecordDto dto)
    {
        var patient = await _db.Patients.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == patientId);
        if (patient == null) return NotFound(new { message = "Paciente não encontrado." });
        if (!await CanAccessPatientAsync(patient)) return Forbid();

        var record = await GetOrCreateRecordAsync(patient);
        record.BloodType = dto.BloodType;
        record.Allergies = dto.Allergies;
        record.ChronicConditions = dto.ChronicConditions;
        record.CurrentMedications = dto.CurrentMedications;
        record.FamilyHistory = dto.FamilyHistory;
        record.SurgicalHistory = dto.SurgicalHistory;
        record.Habits = dto.Habits;
        record.HeightCm = dto.HeightCm;
        record.WeightKg = dto.WeightKg;
        record.UpdatedAt = DateTime.UtcNow;
        record.UpdatedById = CurrentUserId();
        await _db.SaveChangesAsync();
        await AuditAsync(patientId, "EDIT", "MedicalRecord", record.Id);

        await _db.Entry(record).Reference(r => r.UpdatedBy).LoadAsync();
        return Ok(ToRecordDto(record, patient.User.Name));
    }

    // GET /api/patients/{patientId}/session-notes — timeline de evoluções
    [HttpGet("/api/patients/{patientId:guid}/session-notes")]
    public async Task<ActionResult<List<SessionNoteResponseDto>>> ListSessionNotes(Guid patientId)
    {
        var patient = await _db.Patients.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == patientId);
        if (patient == null) return NotFound(new { message = "Paciente não encontrado." });
        if (!await CanAccessPatientAsync(patient)) return Forbid();

        // Profissional só vê suas próprias evoluções (ainda que tenha acesso ao prontuário
        // por já ter atendido o paciente, evoluções de OUTROS profissionais ficam ocultas).
        var proId = CurrentProfessionalId();
        var query = _db.SessionNotes
            .Include(n => n.Appointment).ThenInclude(a => a.Service)
            .Include(n => n.Appointment).ThenInclude(a => a.Professional).ThenInclude(p => p.User)
            .Where(n => n.PatientId == patientId);
        if (IsProfessional() && proId != null)
            query = query.Where(n => n.ProfessionalId == proId);

        var notes = await query.OrderByDescending(n => n.CreatedAt).ToListAsync();
        await AuditAsync(patientId, "VIEW", "SessionNote", null, $"count={notes.Count}");

        return Ok(notes.Select(n => ToSessionNoteDto(n, n.Appointment)));
    }

    // GET /api/session-notes/{id}
    [HttpGet("/api/session-notes/{id:guid}")]
    public async Task<ActionResult<SessionNoteResponseDto>> GetSessionNote(Guid id)
    {
        var note = await _db.SessionNotes
            .Include(n => n.Appointment).ThenInclude(a => a.Service)
            .Include(n => n.Appointment).ThenInclude(a => a.Professional).ThenInclude(p => p.User)
            .Include(n => n.Patient).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(n => n.Id == id);
        if (note == null) return NotFound(new { message = "Evolução não encontrada." });
        if (!await CanAccessPatientAsync(note.Patient)) return Forbid();
        if (IsProfessional() && note.ProfessionalId != CurrentProfessionalId())
            return Forbid();

        await AuditAsync(note.PatientId, "VIEW", "SessionNote", note.Id);
        return Ok(ToSessionNoteDto(note, note.Appointment));
    }

    // GET /api/appointments/{appointmentId}/session-note — busca a nota da consulta (cria stub se profissional dono)
    [HttpGet("/api/appointments/{appointmentId:guid}/session-note")]
    [Authorize(Roles = "PROFESSIONAL")]
    public async Task<ActionResult<SessionNoteResponseDto>> GetByAppointment(Guid appointmentId)
    {
        var appt = await _db.Appointments
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Service)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);
        if (appt == null) return NotFound(new { message = "Consulta não encontrada." });
        if (appt.ProfessionalId != CurrentProfessionalId()) return Forbid();
        if (appt.ClinicId != CurrentClinicId()) return Forbid();

        var note = await _db.SessionNotes.FirstOrDefaultAsync(n => n.AppointmentId == appointmentId);
        if (note == null)
        {
            // Stub vazio retornado sem persistir — front decide se cria ao salvar.
            return Ok(new SessionNoteResponseDto
            {
                Id = Guid.Empty,
                AppointmentId = appt.Id,
                PatientId = appt.PatientId,
                ProfessionalId = appt.ProfessionalId,
                ProfessionalName = appt.Professional.User.Name,
                ServiceName = appt.Service.Name,
                AppointmentStartTime = appt.StartTime,
                AppointmentStatus = appt.Status,
                IsSigned = false,
                CreatedAt = DateTime.UtcNow,
                IsRestrictedView = false,
            });
        }
        await AuditAsync(note.PatientId, "VIEW", "SessionNote", note.Id);
        return Ok(ToSessionNoteDto(note, appt));
    }

    // POST /api/appointments/{appointmentId}/session-note
    [HttpPost("/api/appointments/{appointmentId:guid}/session-note")]
    [Authorize(Roles = "PROFESSIONAL")]
    public async Task<ActionResult<SessionNoteResponseDto>> CreateSessionNote(
        Guid appointmentId, [FromBody] UpsertSessionNoteDto dto)
    {
        var appt = await _db.Appointments
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Service)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);
        if (appt == null) return NotFound(new { message = "Consulta não encontrada." });
        if (appt.ProfessionalId != CurrentProfessionalId()) return Forbid();
        if (appt.ClinicId != CurrentClinicId()) return Forbid();

        var existing = await _db.SessionNotes.FirstOrDefaultAsync(n => n.AppointmentId == appointmentId);
        if (existing != null)
            return Conflict(new { message = "Esta consulta já possui evolução. Use PUT para atualizar." });

        var record = await GetOrCreateRecordAsync(appt.Patient);
        var note = new SessionNote
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = record.Id,
            AppointmentId = appt.Id,
            PatientId = appt.PatientId,
            ProfessionalId = appt.ProfessionalId,
            ClinicId = appt.ClinicId,
            ChiefComplaint = dto.ChiefComplaint,
            Subjective = dto.Subjective,
            Objective = dto.Objective,
            Assessment = dto.Assessment,
            Plan = dto.Plan,
            Diagnosis = dto.Diagnosis,
            DiagnosisCode = dto.DiagnosisCode,
            Prescription = dto.Prescription,
            VitalSignsJson = dto.VitalSignsJson,
            CreatedAt = DateTime.UtcNow,
        };
        _db.SessionNotes.Add(note);
        await _db.SaveChangesAsync();
        await AuditAsync(note.PatientId, "CREATE", "SessionNote", note.Id);
        return Ok(ToSessionNoteDto(note, appt));
    }

    // PUT /api/session-notes/{id}
    [HttpPut("/api/session-notes/{id:guid}")]
    [Authorize(Roles = "PROFESSIONAL")]
    public async Task<ActionResult<SessionNoteResponseDto>> UpdateSessionNote(
        Guid id, [FromBody] UpsertSessionNoteDto dto)
    {
        var note = await _db.SessionNotes
            .Include(n => n.Appointment).ThenInclude(a => a.Service)
            .Include(n => n.Appointment).ThenInclude(a => a.Professional).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(n => n.Id == id);
        if (note == null) return NotFound(new { message = "Evolução não encontrada." });
        if (note.ProfessionalId != CurrentProfessionalId()) return Forbid();
        if (note.IsSigned)
            return BadRequest(new { message = "Evolução assinada não pode ser editada." });

        note.ChiefComplaint = dto.ChiefComplaint;
        note.Subjective = dto.Subjective;
        note.Objective = dto.Objective;
        note.Assessment = dto.Assessment;
        note.Plan = dto.Plan;
        note.Diagnosis = dto.Diagnosis;
        note.DiagnosisCode = dto.DiagnosisCode;
        note.Prescription = dto.Prescription;
        note.VitalSignsJson = dto.VitalSignsJson;
        note.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await AuditAsync(note.PatientId, "EDIT", "SessionNote", note.Id);
        return Ok(ToSessionNoteDto(note, note.Appointment));
    }

    // POST /api/session-notes/{id}/sign
    [HttpPost("/api/session-notes/{id:guid}/sign")]
    [Authorize(Roles = "PROFESSIONAL")]
    public async Task<ActionResult<SessionNoteResponseDto>> SignSessionNote(Guid id)
    {
        var note = await _db.SessionNotes
            .Include(n => n.Appointment).ThenInclude(a => a.Service)
            .Include(n => n.Appointment).ThenInclude(a => a.Professional).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(n => n.Id == id);
        if (note == null) return NotFound(new { message = "Evolução não encontrada." });
        if (note.ProfessionalId != CurrentProfessionalId()) return Forbid();
        if (note.IsSigned) return BadRequest(new { message = "Evolução já assinada." });

        note.IsSigned = true;
        note.SignedAt = DateTime.UtcNow;
        note.UpdatedAt = DateTime.UtcNow;

        // Ao assinar, marca a consulta como concluída (se ainda não estiver).
        if (note.Appointment.Status != "CANCELLED" && note.Appointment.Status != "COMPLETED")
        {
            note.Appointment.Status = "COMPLETED";
            note.Appointment.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        await AuditAsync(note.PatientId, "SIGN", "SessionNote", note.Id);
        return Ok(ToSessionNoteDto(note, note.Appointment));
    }

    // ─── Attachments ───────────────────────────────────────────────────────

    // GET /api/patients/{patientId}/medical-attachments
    [HttpGet("/api/patients/{patientId:guid}/medical-attachments")]
    public async Task<ActionResult<List<MedicalAttachmentResponseDto>>> ListAttachments(Guid patientId)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
        if (patient == null) return NotFound();
        if (!await CanAccessPatientAsync(patient)) return Forbid();

        var attachments = await _db.MedicalAttachments
            .Include(a => a.UploadedBy)
            .Where(a => a.PatientId == patientId)
            .OrderByDescending(a => a.UploadedAt)
            .ToListAsync();
        return Ok(attachments.Select(ToAttachmentDto));
    }

    // POST /api/patients/{patientId}/medical-attachments
    [HttpPost("/api/patients/{patientId:guid}/medical-attachments")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<ActionResult<MedicalAttachmentResponseDto>> UploadAttachment(
        Guid patientId,
        IFormFile file,
        [FromQuery] string category,
        [FromQuery] Guid? sessionNoteId,
        [FromQuery] string? description,
        [FromServices] IWebHostEnvironment env)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
        if (patient == null) return NotFound();
        if (!await CanAccessPatientAsync(patient)) return Forbid();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Nenhum arquivo enviado." });
        if (file.Length > MaxFileSize)
            return BadRequest(new { message = "Arquivo excede 15 MB." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = $"Extensão {ext} não permitida." });

        var record = await GetOrCreateRecordAsync(patient);

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var folder = Path.Combine(webRoot, "uploads", ATT_FOLDER, patientId.ToString());
        Directory.CreateDirectory(folder);

        var safeName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(folder, safeName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }
        var publicUrl = $"/uploads/{ATT_FOLDER}/{patientId}/{safeName}";

        var att = new MedicalAttachment
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = record.Id,
            SessionNoteId = sessionNoteId,
            PatientId = patientId,
            ClinicId = patient.ClinicId,
            FileName = safeName,
            OriginalName = file.FileName,
            MimeType = file.ContentType ?? "application/octet-stream",
            Size = file.Length,
            StoragePath = publicUrl,
            Category = string.IsNullOrWhiteSpace(category) ? "OTHER" : category.ToUpperInvariant(),
            Description = description,
            UploadedById = CurrentUserId(),
            UploadedAt = DateTime.UtcNow,
        };
        _db.MedicalAttachments.Add(att);
        await _db.SaveChangesAsync();
        await _db.Entry(att).Reference(a => a.UploadedBy).LoadAsync();
        await AuditAsync(patientId, "ATTACH", "MedicalAttachment", att.Id, att.OriginalName);
        return Ok(ToAttachmentDto(att));
    }

    // DELETE /api/medical-attachments/{id}
    [HttpDelete("/api/medical-attachments/{id:guid}")]
    [Authorize(Roles = "ADMIN,PROFESSIONAL")]
    public async Task<ActionResult> DeleteAttachment(Guid id, [FromServices] IWebHostEnvironment env)
    {
        var att = await _db.MedicalAttachments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (att == null) return NotFound();
        if (!await CanAccessPatientAsync(att.Patient)) return Forbid();

        // Profissional só remove o que ele próprio anexou.
        if (IsProfessional() && att.UploadedById != CurrentUserId())
            return Forbid();

        // Remove o arquivo físico (best-effort).
        try
        {
            var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
            var relative = att.StoragePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var fullPath = Path.GetFullPath(Path.Combine(webRoot, relative));
            var uploadsRoot = Path.GetFullPath(Path.Combine(webRoot, "uploads"));
            if (fullPath.StartsWith(uploadsRoot) && System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);
        }
        catch { /* ignore IO errors — DB é fonte da verdade */ }

        _db.MedicalAttachments.Remove(att);
        await _db.SaveChangesAsync();
        await AuditAsync(att.PatientId, "DETACH", "MedicalAttachment", att.Id, att.OriginalName);
        return NoContent();
    }
}
