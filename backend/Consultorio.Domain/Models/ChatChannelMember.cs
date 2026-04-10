namespace Consultorio.Domain.Models;

public class ChatChannelMember
{
    public Guid Id { get; set; }
    public Guid ChatChannelId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = "MEMBER"; // ADMIN, MEMBER
    public DateTime JoinedAt { get; set; }

    // Navigation properties
    public ChatChannel ChatChannel { get; set; } = null!;
    public User User { get; set; } = null!;
}
