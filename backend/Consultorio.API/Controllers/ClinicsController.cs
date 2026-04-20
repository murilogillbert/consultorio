using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.API.DTOs;
using Consultorio.API.Services;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClinicsController : ControllerBase
{
    private readonly AppDbContext        _db;
    private readonly MercadoPagoService  _mp;
    private readonly GoogleOAuthService  _googleOAuth;
    private readonly WhatsAppCloudService _whatsApp;
    private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public ClinicsController(AppDbContext db, MercadoPagoService mp, GoogleOAuthService googleOAuth, WhatsAppCloudService whatsApp)
    {
        _db = db;
        _mp = mp;
        _googleOAuth = googleOAuth;
        _whatsApp = whatsApp;
    }

    private static string? Mask(string? token) =>
        string.IsNullOrEmpty(token) ? null
            : "••••••••••••••••••" + token[^Math.Min(6, token.Length)..];

    // Strips BOM, surrounding whitespace, and control/non-ASCII chars so the
    // stored value is always safe to use in an Authorization header.
    private static string? SanitizeToken(string? raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;
        var clean = raw.TrimStart('\uFEFF').Trim();
        return clean == "" ? null : clean;
    }

    private static string? MaskSafe(string? token) =>
        string.IsNullOrEmpty(token) ? null
            : "******************" + token[^Math.Min(6, token.Length)..];

    private static bool IsMasked(string? value) =>
        !string.IsNullOrWhiteSpace(value) &&
        (value.TrimStart().StartsWith("*", StringComparison.Ordinal) ||
         value.TrimStart().StartsWith("â€¢", StringComparison.Ordinal) ||
         value.TrimStart().StartsWith("•", StringComparison.Ordinal));

    private static IntegrationSettingsResponseDto ToIntegrationSettingsDto(Clinic clinic) => new()
    {
        GmailClientId = clinic.GmailClientId,
        GmailClientSecret = clinic.GmailClientSecret,
        GmailConnected = clinic.GmailConnected,
        AccessTokenProdMasked = MaskSafe(clinic.MpAccessTokenProd),
        AccessTokenSandboxMasked = MaskSafe(clinic.MpAccessTokenSandbox),
        PublicKey = clinic.MpPublicKey,
        SandboxMode = clinic.MpSandboxMode,
        Connected = clinic.MpConnected,
        WaPhoneNumberId = clinic.WaPhoneNumberId,
        WaWabaId = clinic.WaWabaId,
        WaAccessTokenMasked = MaskSafe(clinic.WaAccessToken),
        WaVerifyTokenMasked = MaskSafe(clinic.WaVerifyToken),
        WaAppSecretMasked = MaskSafe(clinic.WaAppSecret),
        WaConnected = clinic.WaConnected,
    };

    // GET /api/clinics
    [HttpGet]
    public async Task<ActionResult<List<ClinicResponseDto>>> GetAll()
    {
        var clinics = await _db.Clinics
            .Where(c => c.IsActive)
            .ToListAsync();

        return Ok(clinics.Select(ClinicResponseDto.FromModel));
    }

    // GET /api/clinics/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ClinicResponseDto>> GetById(Guid id)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "Clínica não encontrada." });

        return Ok(ClinicResponseDto.FromModel(clinic));
    }

    // POST /api/clinics
    [HttpPost]
    public async Task<ActionResult<ClinicResponseDto>> Create([FromBody] CreateClinicDto dto)
    {
        var clinic = new Clinic
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address,
            City = dto.City,
            State = dto.State,
            PostalCode = dto.PostalCode,
            Website = dto.Website,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Clinics.Add(clinic);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = clinic.Id }, ClinicResponseDto.FromModel(clinic));
    }

    // PUT /api/clinics/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<ClinicResponseDto>> Update(Guid id, [FromBody] UpdateClinicDto dto)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "Clínica não encontrada." });

        if (dto.Name != null) clinic.Name = dto.Name;
        if (dto.Description != null) clinic.Description = dto.Description;
        if (dto.Phone != null) clinic.Phone = dto.Phone;
        if (dto.Email != null) clinic.Email = dto.Email;
        if (dto.Address != null) clinic.Address = dto.Address;
        if (dto.City != null) clinic.City = dto.City;
        if (dto.State != null) clinic.State = dto.State;
        if (dto.PostalCode != null) clinic.PostalCode = dto.PostalCode;
        if (dto.Website != null) clinic.Website = dto.Website;
        if (dto.LogoUrl != null) clinic.LogoUrl = dto.LogoUrl;
        if (dto.Cnpj != null) clinic.Cnpj = dto.Cnpj;
        if (dto.Instagram != null) clinic.Instagram = dto.Instagram;
        if (dto.Facebook != null) clinic.Facebook = dto.Facebook;
        if (dto.Youtube != null) clinic.Youtube = dto.Youtube;
        if (dto.Linkedin != null) clinic.Linkedin = dto.Linkedin;
        if (dto.Tiktok != null) clinic.Tiktok = dto.Tiktok;
        if (dto.Whatsapp != null) clinic.Whatsapp = dto.Whatsapp;
        if (dto.Mission != null) clinic.Mission = dto.Mission;
        if (dto.Vision != null) clinic.Vision = dto.Vision;
        if (dto.Values != null) clinic.Values = dto.Values;

        if (dto.Milestones != null)
            clinic.Milestones = JsonSerializer.Serialize(dto.Milestones, _jsonOpts);

        if (dto.GalleryUrls != null)
            clinic.GalleryUrls = JsonSerializer.Serialize(dto.GalleryUrls);

        if (dto.ThemeColors != null)
            clinic.ThemeColors = JsonSerializer.Serialize(dto.ThemeColors, _jsonOpts);

        clinic.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(ClinicResponseDto.FromModel(clinic));
    }

    // ─── GET /api/clinics/{id}/settings/integrations ──────────────────────────
    [HttpGet("{id}/settings/integrations")]
    [Authorize]
    public async Task<ActionResult<IntegrationSettingsResponseDto>> GetIntegrations(Guid id)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "Clínica não encontrada." });

        return Ok(ToIntegrationSettingsDto(clinic));
    }

    // ─── PUT /api/clinics/{id}/settings/integrations ──────────────────────────
    [HttpPut("{id}/settings/integrations")]
    [Authorize]
    public async Task<ActionResult<IntegrationSettingsResponseDto>> UpdateIntegrations(
        Guid id, [FromBody] UpdateIntegrationSettingsDto dto)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "Clínica não encontrada." });

        if (dto.GmailClientId     != null) clinic.GmailClientId     = dto.GmailClientId     == "" ? null : dto.GmailClientId;
        if (dto.GmailClientSecret != null) clinic.GmailClientSecret = dto.GmailClientSecret == "" ? null : dto.GmailClientSecret;
        if (dto.GmailAccessToken  != null)
        {
            clinic.GmailAccessToken = dto.GmailAccessToken == "" ? null : dto.GmailAccessToken;
            if (dto.GmailAccessToken == "")
                clinic.GmailTokenExpiresAt = null;
        }
        if (dto.GmailRefreshToken != null) clinic.GmailRefreshToken = dto.GmailRefreshToken == "" ? null : dto.GmailRefreshToken;
        if (dto.GmailConnected.HasValue)   clinic.GmailConnected    = dto.GmailConnected.Value;

        // Only overwrite if the client sent a non-null value.
        // Sending "" explicitly clears the field.
        // Sanitize tokens: strip BOM and surrounding whitespace to prevent
        // "Request headers must contain only ASCII characters" on next API call.
        if (dto.AccessTokenProd    != null) clinic.MpAccessTokenProd    = SanitizeToken(dto.AccessTokenProd);
        if (dto.AccessTokenSandbox != null) clinic.MpAccessTokenSandbox = SanitizeToken(dto.AccessTokenSandbox);
        if (dto.PublicKey          != null) clinic.MpPublicKey          = dto.PublicKey == "" ? null : dto.PublicKey;
        if (dto.SandboxMode.HasValue)       clinic.MpSandboxMode        = dto.SandboxMode.Value;
        if (dto.Connected.HasValue)         clinic.MpConnected          = dto.Connected.Value;

        if (dto.WaPhoneNumberId != null) clinic.WaPhoneNumberId = dto.WaPhoneNumberId.Trim() == "" ? null : dto.WaPhoneNumberId.Trim();
        if (dto.WaWabaId        != null) clinic.WaWabaId        = dto.WaWabaId.Trim() == "" ? null : dto.WaWabaId.Trim();
        if (dto.WaAccessToken   != null && !IsMasked(dto.WaAccessToken)) clinic.WaAccessToken = WhatsAppCloudService.SanitizeSecret(dto.WaAccessToken);
        if (dto.WaVerifyToken   != null && !IsMasked(dto.WaVerifyToken)) clinic.WaVerifyToken = WhatsAppCloudService.SanitizeSecret(dto.WaVerifyToken);
        if (dto.WaAppSecret     != null && !IsMasked(dto.WaAppSecret))   clinic.WaAppSecret   = WhatsAppCloudService.SanitizeSecret(dto.WaAppSecret);
        if (dto.WaConnected.HasValue) clinic.WaConnected = dto.WaConnected.Value;

        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ToIntegrationSettingsDto(clinic));
    }

    // ─── POST /api/clinics/{id}/settings/integrations/mercadopago/test ────────
    [HttpPost("{id}/settings/integrations/gmail/test")]
    [Authorize]
    public async Task<ActionResult> TestGmail(Guid id)
    {
        try
        {
            var email = await _googleOAuth.TestConnectionAsync(id);
            return Ok(new
            {
                ok = true,
                message = "Gmail conectado com sucesso",
                detail = email,
            });
        }
        catch (GoogleOAuthException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpPost("{id}/settings/integrations/mercadopago/test")]
    [Authorize]
    public async Task<ActionResult> TestMercadoPago(Guid id)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "Clínica não encontrada." });

        var token = clinic.MpSandboxMode
            ? clinic.MpAccessTokenSandbox
            : clinic.MpAccessTokenProd;

        // Fall back to appsettings token if none stored in DB
        if (string.IsNullOrWhiteSpace(token))
            token = null; // MercadoPagoService will use its fallback

        try
        {
            var info = await _mp.TestConnectionAsync(token);

            // Mark as connected on successful test
            clinic.MpConnected = true;
            clinic.UpdatedAt   = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                ok      = true,
                message = $"Conectado · {info.Email}",
                detail  = $"Site: {info.SiteId} · Modo: {(clinic.MpSandboxMode ? "Sandbox" : "Produção")}",
            });
        }
        catch (Exception ex)
        {
            clinic.MpConnected = false;
            clinic.UpdatedAt   = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { ok = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/settings/integrations/whatsapp/test")]
    [Authorize]
    public async Task<ActionResult> TestWhatsApp(Guid id)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "ClÃ­nica nÃ£o encontrada." });

        try
        {
            var info = await _whatsApp.TestConnectionAsync(id);

            clinic.WaConnected = true;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var label = string.IsNullOrWhiteSpace(info.VerifiedName)
                ? info.DisplayPhoneNumber
                : $"{info.VerifiedName} · {info.DisplayPhoneNumber}";

            return Ok(new
            {
                ok = true,
                message = string.IsNullOrWhiteSpace(label) ? "WhatsApp conectado com sucesso" : $"WhatsApp conectado · {label}",
                detail = $"Phone Number ID: {info.PhoneNumberId}",
            });
        }
        catch (WhatsAppCloudException ex)
        {
            clinic.WaConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return StatusCode(ex.StatusCode, new { ok = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            clinic.WaConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { ok = false, message = ex.Message });
        }
    }
}
