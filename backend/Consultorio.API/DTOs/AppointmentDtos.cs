namespace Consultorio.API.DTOs;

public class CreateAppointmentDto
{
    public Guid ServiceId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid? RoomId { get; set; }
    public DateTime StartTime { get; set; }
    public string? Notes { get; set; }
}

public class UpdateStatusDto
{
    public string Status { get; set; } = null!;
}

public class CancelAppointmentDto
{
    public string? Reason { get; set; }
}

public class UpdateAppointmentDto
{
    public string? Status { get; set; }
    public Guid? RoomId { get; set; }
    public DateTime? StartTime { get; set; }
    public string? Notes { get; set; }
}

public class AppointmentResponseDto
{
    public Guid Id { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Status { get; set; } = null!;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    // Dados aninhados para o frontend
    public AppointmentServiceDto Service { get; set; } = null!;
    public AppointmentPersonDto Patient { get; set; } = null!;
    public AppointmentPersonDto Professional { get; set; } = null!;
    public AppointmentRoomDto? Room { get; set; }
    public string? PaymentStatus { get; set; }
    public decimal? PaymentAmount { get; set; }
    public string? PaymentMethod { get; set; }
    public Guid? PaymentId { get; set; }
}

public class AppointmentServiceDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public int Duration { get; set; }
    public string Color { get; set; } = null!;
    public decimal Price { get; set; }
}

public class AppointmentPersonDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? AvatarUrl { get; set; }
}

public class AppointmentRoomDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
}
