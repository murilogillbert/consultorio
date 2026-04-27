namespace Consultorio.Domain.Models;

public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    // Optional unique username for login. When set, allows login by username
    // instead of email — required for patients who share an email (e.g. mother
    // and children sharing one email address).
    public string? Username { get; set; }
    public string PasswordHash { get; set; } = null!;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; } = true;
    // OtpCode/OtpExpiry are reused for password recovery: generate a 6-digit
    // code, store with expiry, validate on reset.
    public string? OtpCode { get; set; }
    public DateTime? OtpExpiry { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public SystemUser? SystemUser { get; set; }
    public Professional? Professional { get; set; }
    public Patient? Patient { get; set; }
    public ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
    public ICollection<ChatChannelMember> ChatChannelMemberships { get; set; } = new List<ChatChannelMember>();
}
