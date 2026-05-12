namespace Consultorio.Domain.Models;

// Evolução clínica de um atendimento (uma por Appointment).
// Após `IsSigned = true` a nota se torna somente-leitura.
public class SessionNote
{
    public Guid Id { get; set; }
    public Guid MedicalRecordId { get; set; }
    public Guid AppointmentId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid ClinicId { get; set; }

    public string? ChiefComplaint { get; set; }
    // Modelo SOAP (Subjective, Objective, Assessment, Plan).
    public string? Subjective { get; set; }
    public string? Objective { get; set; }
    public string? Assessment { get; set; }
    public string? Plan { get; set; }
    public string? Diagnosis { get; set; }
    public string? DiagnosisCode { get; set; } // CID-10 opcional
    public string? Prescription { get; set; }
    // Sinais vitais armazenados como JSON: { bp, hr, temp, spo2, weight }.
    public string? VitalSignsJson { get; set; }

    public bool IsSigned { get; set; }
    public DateTime? SignedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public MedicalRecord MedicalRecord { get; set; } = null!;
    public Appointment Appointment { get; set; } = null!;
    public Patient Patient { get; set; } = null!;
    public Professional Professional { get; set; } = null!;
    public Clinic Clinic { get; set; } = null!;
}
