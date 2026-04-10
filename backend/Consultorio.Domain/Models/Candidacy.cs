namespace Consultorio.Domain.Models;

public class Candidacy
{
    public Guid Id { get; set; }
    public Guid JobOpeningId { get; set; }
    public string CandidateName { get; set; } = null!;
    public string CandidateEmail { get; set; } = null!;
    public string? CandidatePhone { get; set; }
    public string? ResumeUrl { get; set; }
    public string Status { get; set; } = "SUBMITTED"; // SUBMITTED, REVIEWING, INTERVIEWED, REJECTED, HIRED
    public string? Notes { get; set; }
    public DateTime SubmissionDate { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public JobOpening JobOpening { get; set; } = null!;
}
