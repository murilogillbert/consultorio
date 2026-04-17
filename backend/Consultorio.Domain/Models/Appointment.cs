namespace Consultorio.Domain.Models;

public class Appointment
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public Guid ServiceId { get; set; }
    public Guid? InsurancePlanId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid? RoomId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Status { get; set; } = "SCHEDULED"; // SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Clinic Clinic { get; set; } = null!;
    public Service Service { get; set; } = null!;
    public InsurancePlan? InsurancePlan { get; set; }
    public Patient Patient { get; set; } = null!;
    public Professional Professional { get; set; } = null!;
    public Room? Room { get; set; }
    public Payment? Payment { get; set; }
    public ICollection<EquipmentUsage> EquipmentUsages { get; set; } = new List<EquipmentUsage>();
}
