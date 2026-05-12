namespace Consultorio.Domain.Models;

// Anexo clínico vinculado ao prontuário (e opcionalmente a uma evolução).
public class MedicalAttachment
{
    public Guid Id { get; set; }
    public Guid MedicalRecordId { get; set; }
    public Guid? SessionNoteId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ClinicId { get; set; }

    public string FileName { get; set; } = null!;
    public string OriginalName { get; set; } = null!;
    public string MimeType { get; set; } = null!;
    public long Size { get; set; }
    public string StoragePath { get; set; } = null!; // ex.: /uploads/medical/{patientId}/{file}
    // Categoria — EXAM | IMAGE | REPORT | PRESCRIPTION | RECEIPT | CERTIFICATE | OTHER
    public string Category { get; set; } = "OTHER";
    public string? Description { get; set; }

    public Guid UploadedById { get; set; }
    public DateTime UploadedAt { get; set; }

    // Navigation
    public MedicalRecord MedicalRecord { get; set; } = null!;
    public SessionNote? SessionNote { get; set; }
    public Patient Patient { get; set; } = null!;
    public Clinic Clinic { get; set; } = null!;
    public User UploadedBy { get; set; } = null!;
}
