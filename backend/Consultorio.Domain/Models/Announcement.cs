namespace Consultorio.Domain.Models;

public class Announcement
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public Guid PublishedById { get; set; }
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string? FileUrl { get; set; }
    public string Urgency { get; set; } = "NORMAL";   // NORMAL, IMPORTANT, URGENT
    public string Audience { get; set; } = "ALL";      // ALL, STAFF, PROFESSIONALS, SPECIFIC
    public string? AudienceIds { get; set; }
    public bool Active { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Clinic Clinic { get; set; } = null!;
    public User PublishedBy { get; set; } = null!;
}
