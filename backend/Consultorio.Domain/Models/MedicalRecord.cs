namespace Consultorio.Domain.Models;

// Prontuário clínico — 1:1 com Patient. Contém a "ficha" estática
// (alergias, condições crônicas, etc.) e agrupa as evoluções por sessão
// (SessionNote) e os anexos clínicos (MedicalAttachment).
public class MedicalRecord
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid ClinicId { get; set; }

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
    public Guid? UpdatedById { get; set; }

    // Navigation
    public Patient Patient { get; set; } = null!;
    public Clinic Clinic { get; set; } = null!;
    public User? UpdatedBy { get; set; }
    public ICollection<SessionNote> SessionNotes { get; set; } = new List<SessionNote>();
    public ICollection<MedicalAttachment> Attachments { get; set; } = new List<MedicalAttachment>();
}
