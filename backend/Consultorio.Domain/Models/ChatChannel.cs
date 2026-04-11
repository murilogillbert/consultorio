namespace Consultorio.Domain.Models;

public class ChatChannel
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Type { get; set; } = "DIRECT"; // DIRECT, GROUP, ANNOUNCEMENT
    public bool AdminOnly { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Clinic Clinic { get; set; } = null!;
    public ICollection<ChatChannelMember> Members { get; set; } = new List<ChatChannelMember>();
    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}
