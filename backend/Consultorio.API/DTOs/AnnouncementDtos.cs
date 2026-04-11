namespace Consultorio.API.DTOs;

public class CreateAnnouncementDto
{
    public Guid? ClinicId { get; set; }
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string? FileUrl { get; set; }
    public string Urgency { get; set; } = "NORMAL";
    public string Audience { get; set; } = "ALL";
    public string? AudienceIds { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class UpdateAnnouncementDto
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? Urgency { get; set; }
    public string? Audience { get; set; }
    public string? AudienceIds { get; set; }
    public bool? Active { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class AnnouncementResponseDto
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public Guid PublishedById { get; set; }
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string? FileUrl { get; set; }
    public string Urgency { get; set; } = null!;
    public string Audience { get; set; } = null!;
    public string? AudienceIds { get; set; }
    public bool Active { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public AnnouncementPublisherDto? PublishedBy { get; set; }
}

public class AnnouncementPublisherDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? AvatarUrl { get; set; }
}
