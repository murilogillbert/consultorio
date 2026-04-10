namespace Consultorio.API.DTOs;

public class BannerResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? Link { get; set; }
    public int Order { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateBannerDto
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? Link { get; set; }
    public int Order { get; set; } = 0;
}

public class UpdateBannerDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? Link { get; set; }
    public int? Order { get; set; }
    public bool? IsActive { get; set; }
}

public class InsurancePlanResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateInsurancePlanDto
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
}

public class UpdateInsurancePlanDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}
