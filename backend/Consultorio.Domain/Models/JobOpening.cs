namespace Consultorio.Domain.Models;

public class JobOpening
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? Requirements { get; set; }
    public string Status { get; set; } = "OPEN"; // OPEN, CLOSED, FILLED
    public DateTime PostedDate { get; set; }
    public DateTime? ClosingDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Clinic Clinic { get; set; } = null!;
    public ICollection<Candidacy> Candidacies { get; set; } = new List<Candidacy>();
}
