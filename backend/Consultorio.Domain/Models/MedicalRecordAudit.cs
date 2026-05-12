namespace Consultorio.Domain.Models;

// Trilha de auditoria para qualquer acesso ao prontuário — requisito LGPD.
// Persistimos imutavelmente; nenhum fluxo do app remove registros.
public class MedicalRecordAudit
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid ClinicId { get; set; }
    public Guid UserId { get; set; }
    public string UserRole { get; set; } = null!;
    // VIEW | EDIT | CREATE | SIGN | ATTACH | DETACH | EXPORT
    public string Action { get; set; } = null!;
    public string EntityType { get; set; } = null!; // MedicalRecord | SessionNote | MedicalAttachment
    public Guid? EntityId { get; set; }
    public string? Detail { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; }

    public Patient Patient { get; set; } = null!;
    public Clinic Clinic { get; set; } = null!;
    public User User { get; set; } = null!;
}
