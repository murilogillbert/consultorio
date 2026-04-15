namespace Consultorio.Domain.Models;

public class Professional
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public Guid UserId { get; set; }
    public string LicenseNumber { get; set; } = null!;
    public string? Specialty { get; set; }
    public string? Bio { get; set; }
    public bool IsAvailable { get; set; } = true;
    public decimal Commission { get; set; } = 50m;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Clinic Clinic { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
    public ICollection<Block> Blocks { get; set; } = new List<Block>();
    public ICollection<ProfessionalReview> Reviews { get; set; } = new List<ProfessionalReview>();
}
