namespace Consultorio.API.DTOs;

// DTO de criação — o que o cliente envia no POST
public class CreateServiceDto
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? ShortDescription { get; set; }
    public string? Preparation { get; set; }
    public bool OnlineBooking { get; set; } = true;
    public int DurationMinutes { get; set; } = 60;
    public decimal Price { get; set; }
    public bool ShowPrice { get; set; } = true;
    public bool ShowDuration { get; set; } = true;
    public string? Category { get; set; }
    public bool RequiresRoom { get; set; } = false;
    public Guid? DefaultRoomId { get; set; }
    public string Color { get; set; } = "#007BFF";
    // Vinculações (many-to-many)
    public List<Guid>? ProfessionalIds { get; set; }
    public List<InsuranceBindingDto>? Insurances { get; set; }
    public List<Guid>? EquipmentIds { get; set; }
    public List<Guid>? RoomIds { get; set; }
}

/// <summary>Input binding for insurance per service: id + optional price + visibility.</summary>
public class InsuranceBindingDto
{
    public Guid InsuranceId { get; set; }
    public decimal? Price { get; set; }
    public bool ShowPrice { get; set; } = true;
}

// DTO de atualização — o que o cliente envia no PUT
public class UpdateServiceDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? ShortDescription { get; set; }
    public string? Preparation { get; set; }
    public bool? OnlineBooking { get; set; }
    public int? DurationMinutes { get; set; }
    public decimal? Price { get; set; }
    public bool? ShowPrice { get; set; }
    public bool? ShowDuration { get; set; }
    public string? Category { get; set; }
    public bool? RequiresRoom { get; set; }
    public Guid? DefaultRoomId { get; set; }
    public string? Color { get; set; }
    public bool? IsActive { get; set; }
    // Vinculações (many-to-many) — null = não alterar
    public List<Guid>? ProfessionalIds { get; set; }
    public List<InsuranceBindingDto>? Insurances { get; set; }
    public List<Guid>? EquipmentIds { get; set; }
    public List<Guid>? RoomIds { get; set; }
}

// Resumo de profissional vinculado ao serviço
public class ServiceProfessionalSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? AvatarUrl { get; set; }
}

// Resumo de convênio vinculado ao serviço
public class ServiceInsuranceSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public decimal? Price { get; set; }
    public bool ShowPrice { get; set; } = true;
}

// Resumo de equipamento vinculado ao serviço
public class ServiceEquipmentSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
}

// Resumo de sala vinculada ao serviço
public class ServiceRoomSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
}

// DTO de resposta — o que a API devolve para o cliente
public class ServiceResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? ShortDescription { get; set; }
    public string? Preparation { get; set; }
    public bool OnlineBooking { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public bool ShowPrice { get; set; } = true;
    public bool ShowDuration { get; set; } = true;
    public string? Category { get; set; }
    public bool RequiresRoom { get; set; }
    public Guid? DefaultRoomId { get; set; }
    public string Color { get; set; } = null!;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ServiceProfessionalSummaryDto> Professionals { get; set; } = new();
    public List<ServiceInsuranceSummaryDto> InsurancePlans { get; set; } = new();
    public List<ServiceEquipmentSummaryDto> Equipments { get; set; } = new();
    public List<ServiceRoomSummaryDto> Rooms { get; set; } = new();
}
