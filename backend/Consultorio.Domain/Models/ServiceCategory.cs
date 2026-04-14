namespace Consultorio.Domain.Models;

public class ServiceCategory
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Clinic Clinic { get; set; } = null!;
}
