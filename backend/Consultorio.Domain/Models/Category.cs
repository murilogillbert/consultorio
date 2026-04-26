namespace Consultorio.Domain.Models;

/// <summary>
/// Categorias gerenciáveis pelo admin. Tipos suportados:
/// - "USER": categorias de usuário (perfis de acesso ao sistema)
/// - "PROFESSIONAL": categorias profissionais (Psicólogo, Dentista, Cirurgião, …)
/// - "SPECIALTY": especialidades, opcionalmente vinculadas a uma categoria profissional via ParentId.
/// </summary>
public class Category
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }

    /// <summary>"USER" | "PROFESSIONAL" | "SPECIALTY"</summary>
    public string Type { get; set; } = null!;

    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    /// <summary>For SPECIALTY rows, optional FK to a PROFESSIONAL category.</summary>
    public Guid? ParentId { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Clinic? Clinic { get; set; }
    public Category? Parent { get; set; }
    public ICollection<Category> Children { get; set; } = new List<Category>();
}
