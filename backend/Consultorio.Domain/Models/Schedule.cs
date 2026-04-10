namespace Consultorio.Domain.Models;

public class Schedule
{
    public Guid Id { get; set; }
    public Guid ProfessionalId { get; set; }
    public int DayOfWeek { get; set; } // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Professional Professional { get; set; } = null!;
}
