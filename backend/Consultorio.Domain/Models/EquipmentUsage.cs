namespace Consultorio.Domain.Models;

public class EquipmentUsage
{
    public Guid Id { get; set; }
    public Guid EquipmentId { get; set; }
    public Guid AppointmentId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Equipment Equipment { get; set; } = null!;
    public Appointment Appointment { get; set; } = null!;
}
