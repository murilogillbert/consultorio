namespace Consultorio.API.DTOs;

// DTO de criação — o que o cliente envia no POST
public class CreateServiceDto
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public decimal Price { get; set; }
    public string? Category { get; set; }
    public bool RequiresRoom { get; set; } = false;
    public Guid? DefaultRoomId { get; set; }
    public string Color { get; set; } = "#007BFF";
}

// DTO de atualização — o que o cliente envia no PUT
public class UpdateServiceDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int? DurationMinutes { get; set; }
    public decimal? Price { get; set; }
    public string? Category { get; set; }
    public bool? RequiresRoom { get; set; }
    public Guid? DefaultRoomId { get; set; }
    public string? Color { get; set; }
    public bool? IsActive { get; set; }
}

// DTO de resposta — o que a API devolve para o cliente
public class ServiceResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string? Category { get; set; }
    public bool RequiresRoom { get; set; }
    public Guid? DefaultRoomId { get; set; }
    public string Color { get; set; } = null!;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
