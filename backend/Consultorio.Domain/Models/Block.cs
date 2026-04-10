namespace Consultorio.Domain.Models;

public class Block
{
    public Guid Id { get; set; }
    public Guid ProfessionalId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Professional Professional { get; set; } = null!;
}
