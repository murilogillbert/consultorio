namespace Consultorio.API.DTOs;

// ─── MedicalRecord (ficha clínica fixa) ────────────────────────────────────
public class MedicalRecordResponseDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = null!;
    public string? BloodType { get; set; }
    public string? Allergies { get; set; }
    public string? ChronicConditions { get; set; }
    public string? CurrentMedications { get; set; }
    public string? FamilyHistory { get; set; }
    public string? SurgicalHistory { get; set; }
    public string? Habits { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedByName { get; set; }
    // Indica que campos clínicos foram redigidos (recepção: só ve metadata + dados críticos).
    public bool IsRestrictedView { get; set; }
}

public class UpdateMedicalRecordDto
{
    public string? BloodType { get; set; }
    public string? Allergies { get; set; }
    public string? ChronicConditions { get; set; }
    public string? CurrentMedications { get; set; }
    public string? FamilyHistory { get; set; }
    public string? SurgicalHistory { get; set; }
    public string? Habits { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
}

// ─── SessionNote ───────────────────────────────────────────────────────────
public class SessionNoteResponseDto
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public string ProfessionalName { get; set; } = null!;
    public string ServiceName { get; set; } = null!;
    public DateTime AppointmentStartTime { get; set; }
    public string AppointmentStatus { get; set; } = null!;

    public string? ChiefComplaint { get; set; }
    public string? Subjective { get; set; }
    public string? Objective { get; set; }
    public string? Assessment { get; set; }
    public string? Plan { get; set; }
    public string? Diagnosis { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? Prescription { get; set; }
    public string? VitalSignsJson { get; set; }
    public bool IsSigned { get; set; }
    public DateTime? SignedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Quando true, os campos clínicos foram suprimidos para a role atual
    // (recepção vê apenas metadados — data/profissional/serviço/status).
    public bool IsRestrictedView { get; set; }
}

public class UpsertSessionNoteDto
{
    public string? ChiefComplaint { get; set; }
    public string? Subjective { get; set; }
    public string? Objective { get; set; }
    public string? Assessment { get; set; }
    public string? Plan { get; set; }
    public string? Diagnosis { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? Prescription { get; set; }
    public string? VitalSignsJson { get; set; }
}

// ─── MedicalAttachment ─────────────────────────────────────────────────────
public class MedicalAttachmentResponseDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? SessionNoteId { get; set; }
    public string FileName { get; set; } = null!;
    public string OriginalName { get; set; } = null!;
    public string MimeType { get; set; } = null!;
    public long Size { get; set; }
    public string Url { get; set; } = null!;
    public string Category { get; set; } = null!;
    public string? Description { get; set; }
    public Guid UploadedById { get; set; }
    public string UploadedByName { get; set; } = null!;
    public DateTime UploadedAt { get; set; }
}
