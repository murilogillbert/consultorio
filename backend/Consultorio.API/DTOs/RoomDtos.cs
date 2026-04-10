namespace Consultorio.API.DTOs;

public class CreateRoomDto
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? Location { get; set; }
    public int Capacity { get; set; } = 1;
}

public class UpdateRoomDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
    public int? Capacity { get; set; }
    public bool? IsActive { get; set; }
}

public class RoomResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? Location { get; set; }
    public int Capacity { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
