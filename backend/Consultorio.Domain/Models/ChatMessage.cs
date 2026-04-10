namespace Consultorio.Domain.Models;

public class ChatMessage
{
    public Guid Id { get; set; }
    public Guid ChatChannelId { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = null!;
    public bool IsEdited { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ChatChannel ChatChannel { get; set; } = null!;
    public User User { get; set; } = null!;
}
