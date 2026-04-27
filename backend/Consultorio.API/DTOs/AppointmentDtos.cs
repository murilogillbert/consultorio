namespace Consultorio.API.DTOs;

public class CreateAppointmentDto
{
    public Guid ServiceId { get; set; }
    public Guid? InsurancePlanId { get; set; }
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
    public string? Source { get; set; }
}

public class UpdateAppointmentDto
{
    public string? Status { get; set; }
    public Guid? PatientId { get; set; }
    public Guid? ProfessionalId { get; set; }
    public Guid? ServiceId { get; set; }
    public Guid? RoomId { get; set; }
    public Guid? EquipmentId { get; set; }
    public Guid? InsurancePlanId { get; set; }
    public DateTime? StartTime { get; set; }
    public string? Notes { get; set; }
}

// Cria N consultas semanalmente no mesmo dia/horário até completar o período
// solicitado (ex.: 90 dias). Retorna estatísticas de criação e conflitos.
public class CreateRecurringAppointmentsDto
{
    public Guid ServiceId { get; set; }
    public Guid? InsurancePlanId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid? RoomId { get; set; }
    public DateTime StartTime { get; set; }
    public string? Notes { get; set; }
    // Período total (em dias) durante o qual as consultas devem ser repetidas
    // semanalmente. Padrão: 90.
    public int DurationDays { get; set; } = 90;
}

public class RecurringAppointmentsResultDto
{
    public int Created { get; set; }
    public int Skipped { get; set; }
    public List<DateTime> CreatedDates { get; set; } = new();
    public List<DateTime> SkippedDates { get; set; } = new();
    public string Message { get; set; } = "";
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
    public AppointmentInsuranceDto? InsurancePlan { get; set; }
    public AppointmentPersonDto Patient { get; set; } = null!;
    public AppointmentPersonDto Professional { get; set; } = null!;
    public AppointmentRoomDto? Room { get; set; }
    public string? CancellationSource { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? PaymentStatus { get; set; }
    public decimal? PaymentAmount { get; set; }
    public string? PaymentMethod { get; set; }
    public Guid? PaymentId { get; set; }
}

public class AppointmentInsuranceDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public decimal? Price { get; set; }
    public bool ShowPrice { get; set; }
}

public class AppointmentServiceDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public int Duration { get; set; }
    public string Color { get; set; } = null!;
    public decimal Price { get; set; }
    public bool ShowPrice { get; set; }
    public bool OnlineBooking { get; set; }
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
