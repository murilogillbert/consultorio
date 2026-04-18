namespace Consultorio.API.DTOs;

public class PaymentResponseDto
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "PENDING";
    public string? PaymentMethod { get; set; }
    public string? TransactionId { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? Notes { get; set; }
    public bool PaidBeforeCompletion { get; set; }
    public string? ExternalPaymentId { get; set; }
    public string? ExternalQrCode { get; set; }
    public string? ExternalQrCodeBase64 { get; set; }
    public string? ExternalCheckoutUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>Payload para registrar cobrança — único endpoint que a recepção usa</summary>
public class ChargeRequestDto
{
    public Guid AppointmentId { get; set; }
    /// <summary>CASH | PIX | CREDIT_CARD | DEBIT_CARD | INSURANCE | OTHER</summary>
    public string Method { get; set; } = null!;
    /// <summary>Valor; se omitido usa o preço do serviço</summary>
    public decimal? Amount { get; set; }
    public string? Notes { get; set; }
    // Dados do pagador para Mercado Pago
    public string? PayerEmail { get; set; }
    public string? PayerFirstName { get; set; }
    public string? PayerLastName { get; set; }
    public string? PayerCpf { get; set; }
}

public class ChargeResponseDto
{
    public Guid PaymentId { get; set; }
    public string Status { get; set; } = null!;
    public string Method { get; set; } = null!;
    public decimal Amount { get; set; }
    public bool PaidBeforeCompletion { get; set; }
    // Preenchidos para PIX
    public string? QrCode { get; set; }
    public string? QrCodeBase64 { get; set; }
    // Preenchido para cartão
    public string? CheckoutUrl { get; set; }
    public string? ExternalPaymentId { get; set; }
}

public class CreatePaymentDto
{
    public Guid AppointmentId { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
    public string? TransactionId { get; set; }
    public string? Notes { get; set; }
}

public class UpdatePaymentDto
{
    public decimal? Amount { get; set; }
    public string? Status { get; set; }
    public string? PaymentMethod { get; set; }
    public string? TransactionId { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? Notes { get; set; }
}
