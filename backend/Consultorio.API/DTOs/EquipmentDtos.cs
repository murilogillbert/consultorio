namespace Consultorio.API.DTOs;

public class EquipmentResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? SerialNumber { get; set; }
    public string? Location { get; set; }
    public string Status { get; set; } = "OPERATIONAL";
    public DateTime? MaintenanceDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateEquipmentDto
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? SerialNumber { get; set; }
    public string? Location { get; set; }
    public string? Status { get; set; }
    public DateTime? MaintenanceDate { get; set; }
}

public class UpdateEquipmentDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? SerialNumber { get; set; }
    public string? Location { get; set; }
    public string? Status { get; set; }
    public DateTime? MaintenanceDate { get; set; }
    public bool? IsActive { get; set; }
}

public class EquipmentUsageResponseDto
{
    public Guid Id { get; set; }
    public Guid EquipmentId { get; set; }
    public Guid AppointmentId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateEquipmentUsageDto
{
    public Guid EquipmentId { get; set; }
    public Guid AppointmentId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Notes { get; set; }
}
