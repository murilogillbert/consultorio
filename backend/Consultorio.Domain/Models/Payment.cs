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
    /// <summary>true = cobrança registrada ANTES do atendimento ser concluído</summary>
    public bool PaidBeforeCompletion { get; set; } = false;
    /// <summary>ID do pagamento no Mercado Pago (PIX / cartão)</summary>
    public string? ExternalPaymentId { get; set; }
    /// <summary>Copia-e-cola do PIX</summary>
    public string? ExternalQrCode { get; set; }
    /// <summary>QR Code em base64 (PIX)</summary>
    public string? ExternalQrCodeBase64 { get; set; }
    /// <summary>Link de checkout do Mercado Pago (cartão)</summary>
    public string? ExternalCheckoutUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Appointment Appointment { get; set; } = null!;
}
