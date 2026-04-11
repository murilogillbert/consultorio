namespace Consultorio.API.DTOs;

public class CreateChatChannelDto
{
    public Guid ClinicId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Type { get; set; } = "CHANNEL";
    public bool AdminOnly { get; set; }
    public bool Active { get; set; } = true;
}

public class UpdateChatChannelDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Type { get; set; }
    public bool? AdminOnly { get; set; }
    public bool? Active { get; set; }
}

public class ChatChannelResponseDto
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Type { get; set; } = null!;
    public bool AdminOnly { get; set; }
    public bool Active { get; set; }
    public int MemberCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
