using System.Text.Json;

namespace Consultorio.API.DTOs;

// ─── Mercado Pago integration DTOs ───────────────────────────────────────────

public class IntegrationSettingsResponseDto
{
    public string? GmailClientId            { get; set; }
    public string? GmailClientSecret        { get; set; }
    public bool    GmailConnected           { get; set; }
    public string? AccessTokenProdMasked    { get; set; }  // last 6 chars only
    public string? AccessTokenSandboxMasked { get; set; }
    public string? PublicKey                { get; set; }  // public — no masking needed
    public bool    SandboxMode              { get; set; }
    public bool    Connected                { get; set; }
    public string? WaPhoneNumberId          { get; set; }
    public string? WaWabaId                 { get; set; }
    public string? WaAccessTokenMasked      { get; set; }
    public string? WaVerifyTokenMasked      { get; set; }
    public string? WaAppSecretMasked        { get; set; }
    public bool    WaConnected              { get; set; }
}

public class UpdateIntegrationSettingsDto
{
    public string? GmailClientId     { get; set; }
    public string? GmailClientSecret { get; set; }
    public string? GmailAccessToken  { get; set; }
    public string? GmailRefreshToken { get; set; }
    public bool?   GmailConnected    { get; set; }
    public string? AccessTokenProd    { get; set; }
    public string? AccessTokenSandbox { get; set; }
    public string? PublicKey          { get; set; }
    public bool?   SandboxMode        { get; set; }
    public bool?   Connected          { get; set; }
    public string? WaPhoneNumberId    { get; set; }
    public string? WaWabaId           { get; set; }
    public string? WaAccessToken      { get; set; }
    public string? WaVerifyToken      { get; set; }
    public string? WaAppSecret        { get; set; }
    public bool?   WaConnected        { get; set; }
}


public class MilestoneDto
{
    public string Year { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
}

public class CreateClinicDto
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Website { get; set; }
}

public class UpdateClinicDto
{
    public string? Name { get; set; }
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
    public List<MilestoneDto>? Milestones { get; set; }
    public List<string>? GalleryUrls { get; set; }
    public Dictionary<string, string>? ThemeColors { get; set; }
}

public class ClinicResponseDto
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
    public List<MilestoneDto>? Milestones { get; set; }
    public List<string>? GalleryUrls { get; set; }
    public Dictionary<string, string>? ThemeColors { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }

    // Helper: deserialize JSON string fields from model
    public static ClinicResponseDto FromModel(Consultorio.Domain.Models.Clinic c)
    {
        List<MilestoneDto>? milestones = null;
        if (!string.IsNullOrEmpty(c.Milestones))
        {
            try { milestones = JsonSerializer.Deserialize<List<MilestoneDto>>(c.Milestones, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }); }
            catch { }
        }

        List<string>? galleryUrls = null;
        if (!string.IsNullOrEmpty(c.GalleryUrls))
        {
            try { galleryUrls = JsonSerializer.Deserialize<List<string>>(c.GalleryUrls); }
            catch { }
        }

        Dictionary<string, string>? themeColors = null;
        if (!string.IsNullOrEmpty(c.ThemeColors))
        {
            try { themeColors = JsonSerializer.Deserialize<Dictionary<string, string>>(c.ThemeColors, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }); }
            catch { }
        }

        return new ClinicResponseDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            Phone = c.Phone,
            Email = c.Email,
            Address = c.Address,
            City = c.City,
            State = c.State,
            PostalCode = c.PostalCode,
            Website = c.Website,
            LogoUrl = c.LogoUrl,
            Cnpj = c.Cnpj,
            Instagram = c.Instagram,
            Facebook = c.Facebook,
            Youtube = c.Youtube,
            Linkedin = c.Linkedin,
            Tiktok = c.Tiktok,
            Whatsapp = c.Whatsapp,
            Mission = c.Mission,
            Vision = c.Vision,
            Values = c.Values,
            Milestones = milestones,
            GalleryUrls = galleryUrls,
            ThemeColors = themeColors,
            IsActive = c.IsActive,
            CreatedAt = c.CreatedAt
        };
    }
}
