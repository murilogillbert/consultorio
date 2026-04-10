namespace Consultorio.API.DTOs;

// ─── Job Openings ───
public class JobOpeningResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? Requirements { get; set; }
    public string Status { get; set; } = "OPEN";
    public DateTime PostedDate { get; set; }
    public DateTime? ClosingDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public int CandidacyCount { get; set; }
}

public class CreateJobOpeningDto
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? Requirements { get; set; }
    public DateTime? ClosingDate { get; set; }
}

public class UpdateJobOpeningDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Requirements { get; set; }
    public string? Status { get; set; }
    public DateTime? ClosingDate { get; set; }
    public bool? IsActive { get; set; }
}

// ─── Candidacies ───
public class CandidacyResponseDto
{
    public Guid Id { get; set; }
    public Guid JobOpeningId { get; set; }
    public string CandidateName { get; set; } = null!;
    public string CandidateEmail { get; set; } = null!;
    public string? CandidatePhone { get; set; }
    public string? ResumeUrl { get; set; }
    public string Status { get; set; } = "SUBMITTED";
    public string? Notes { get; set; }
    public DateTime SubmissionDate { get; set; }
}

public class CreateCandidacyDto
{
    public Guid JobOpeningId { get; set; }
    public string CandidateName { get; set; } = null!;
    public string CandidateEmail { get; set; } = null!;
    public string? CandidatePhone { get; set; }
    public string? ResumeUrl { get; set; }
    public string? Notes { get; set; }
}

public class UpdateCandidacyDto
{
    public string? Status { get; set; }
    public string? Notes { get; set; }
}
