namespace Consultorio.Domain.Models;

public class PatientMessage
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid ClinicId { get; set; }
    public string Content { get; set; } = null!;
    /// <summary>IN = sent by patient, OUT = sent by staff/clinic</summary>
    public string Direction { get; set; } = "IN";
    /// <summary>Null when sent by patient; set when a staff member replies.</summary>
    public Guid? SentByUserId { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Patient Patient { get; set; } = null!;
    public Clinic Clinic { get; set; } = null!;
    public User? SentByUser { get; set; }
}
