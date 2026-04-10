namespace Consultorio.Domain.Models;

public class SystemUser
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ClinicId { get; set; }
    public string Role { get; set; } = "RECEPTIONIST"; // ADMIN, RECEPTIONIST
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Clinic Clinic { get; set; } = null!;
}
