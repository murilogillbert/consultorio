namespace Consultorio.Domain.Models;

public class AppointmentReminderLog
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public Guid ClinicId { get; set; }

    // EMAIL | WHATSAPP | SMS
    public string Channel { get; set; } = "EMAIL";

    // T_MINUS_24H (porta aberta para T-1H, T-7D no futuro)
    public string ReminderType { get; set; } = "T_MINUS_24H";

    // SENT | FAILED
    public string Status { get; set; } = "SENT";

    public string? ErrorMessage { get; set; }
    public DateTime SentAt { get; set; }

    public Appointment Appointment { get; set; } = null!;
    public Clinic Clinic { get; set; } = null!;
}
