namespace Consultorio.Domain.Models;

public class PatientMessage
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid ClinicId { get; set; }
    public string Content { get; set; } = null!;
    /// <summary>IN = sent by patient, OUT = sent by staff/clinic</summary>
    public string Direction { get; set; } = "IN";
    /// <summary>APP, WHATSAPP, INSTAGRAM or EMAIL.</summary>
    public string Source { get; set; } = "APP";
    /// <summary>Null when sent by patient; set when a staff member replies.</summary>
    public Guid? SentByUserId { get; set; }
    /// <summary>Provider message id, used to prevent duplicated webhook imports.</summary>
    public string? ExternalMessageId { get; set; }
    /// <summary>Provider delivery status, e.g. sent, delivered, read or failed.</summary>
    public string? ExternalStatus { get; set; }
    public DateTime? ExternalTimestamp { get; set; }
    public string? ExternalProvider { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Patient Patient { get; set; } = null!;
    public Clinic Clinic { get; set; } = null!;
    public User? SentByUser { get; set; }
}
