namespace Consultorio.Domain.Models;

public class Equipment
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? SerialNumber { get; set; }
    public string? Location { get; set; }
    public string Status { get; set; } = "OPERATIONAL"; // OPERATIONAL, MAINTENANCE, BROKEN
    public DateTime? MaintenanceDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Clinic Clinic { get; set; } = null!;
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<EquipmentUsage> UsageHistory { get; set; } = new List<EquipmentUsage>();
}
