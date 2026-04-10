namespace Consultorio.Domain.Models;

public class Payment
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "PENDING"; // PENDING, PAID, CANCELLED
    public string? PaymentMethod { get; set; } // CASH, CARD, BANK_TRANSFER, INSURANCE
    public string? TransactionId { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Appointment Appointment { get; set; } = null!;
}
