namespace Consultorio.Domain.Models;

/// <summary>
/// Join entity for Service ↔ InsurancePlan with extra fields:
/// custom price per insurance and visibility flag.
/// </summary>
public class ServiceInsurancePlan
{
    public Guid ServiceId { get; set; }
    public Guid InsurancePlanId { get; set; }

    /// <summary>Price charged when using this insurance. Null = use service default price.</summary>
    public decimal? Price { get; set; }

    /// <summary>Whether the price is visible to the patient on the public site.</summary>
    public bool ShowPrice { get; set; } = true;

    // Navigation
    public Service Service { get; set; } = null!;
    public InsurancePlan InsurancePlan { get; set; } = null!;
}
