namespace Consultorio.Domain.Models;

public class Clinic
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Website { get; set; }
    public string? LogoUrl { get; set; }
    public string? Cnpj { get; set; }
    public string? Instagram { get; set; }
    public string? Facebook { get; set; }
    public string? Youtube { get; set; }
    public string? Linkedin { get; set; }
    public string? Tiktok { get; set; }
    public string? Whatsapp { get; set; }
    public string? Mission { get; set; }
    public string? Vision { get; set; }
    public string? Values { get; set; }
    public string? Milestones { get; set; }   // JSON array
    public string? GalleryUrls { get; set; }  // JSON array
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<SystemUser> Users { get; set; } = new List<SystemUser>();
    public ICollection<Professional> Professionals { get; set; } = new List<Professional>();
    public ICollection<Patient> Patients { get; set; } = new List<Patient>();
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<Room> Rooms { get; set; } = new List<Room>();
    public ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
    public ICollection<Banner> Banners { get; set; } = new List<Banner>();
    public ICollection<ChatChannel> ChatChannels { get; set; } = new List<ChatChannel>();
    public ICollection<ServiceCategory> ServiceCategories { get; set; } = new List<ServiceCategory>();
}
