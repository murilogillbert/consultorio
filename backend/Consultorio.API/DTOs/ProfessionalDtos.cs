namespace Consultorio.API.DTOs;

public class CreateProfessionalDto
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string LicenseNumber { get; set; } = null!;
    public string? Specialty { get; set; }
    public string? Bio { get; set; }
    public string? Phone { get; set; }
    public decimal Commission { get; set; } = 50m;
}

public class UpdateProfessionalDto
{
    public string? Name { get; set; }
    public string? LicenseNumber { get; set; }
    public string? Specialty { get; set; }
    public string? Bio { get; set; }
    public string? Phone { get; set; }
    public bool? IsAvailable { get; set; }
    public string? AvatarUrl { get; set; }
    public decimal? Commission { get; set; }
}

public class ProfessionalResponseDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public string LicenseNumber { get; set; } = null!;
    public string? Specialty { get; set; }
    public string? Bio { get; set; }
    public bool IsAvailable { get; set; }
    public decimal Commission { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Services { get; set; } = new();
    public List<Guid> ServiceIds { get; set; } = new();
    public List<ProfessionalScheduleDto> Schedules { get; set; } = new();
}

public class ProfessionalScheduleDto
{
    public Guid Id { get; set; }
    public int DayOfWeek { get; set; }
    public string StartTime { get; set; } = null!;
    public string EndTime { get; set; } = null!;
}
