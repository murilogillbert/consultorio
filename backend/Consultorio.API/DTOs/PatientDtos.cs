namespace Consultorio.API.DTOs;

public class CreatePatientDto
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? CPF { get; set; }
    public string? Phone { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
}

public class UpdatePatientDto
{
    public string? Name { get; set; }
    public string? CPF { get; set; }
    public string? Phone { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
}

public class PatientResponseDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? CPF { get; set; }
    public string? Phone { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? GeneratedPassword { get; set; }
}
