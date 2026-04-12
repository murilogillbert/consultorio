namespace Consultorio.Domain.Models;

public class Service
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? ShortDescription { get; set; }
    public string? Preparation { get; set; }
    public bool OnlineBooking { get; set; } = true;
    public int DurationMinutes { get; set; } = 60;
    public decimal Price { get; set; }
    public string? Category { get; set; }
    public bool RequiresRoom { get; set; } = false;
    public Guid? DefaultRoomId { get; set; }
    public string Color { get; set; } = "#007BFF";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Clinic Clinic { get; set; } = null!;
    public Room? DefaultRoom { get; set; }
    public ICollection<Professional> Professionals { get; set; } = new List<Professional>();
    public ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
    public ICollection<InsurancePlan> InsurancePlans { get; set; } = new List<InsurancePlan>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
