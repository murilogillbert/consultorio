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
    private readonly AppDbContext _db;
    private readonly MercadoPagoService _mp;
    private readonly GoogleOAuthService _googleOAuth;
    private readonly GmailPubSubService _gmailPubSub;
    private readonly LegacyIntegrationBridge _legacyBridge;
    private readonly IHttpClientFactory _httpClientFactory;
    private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public ClinicsController(
        AppDbContext db,
        MercadoPagoService mp,
        GoogleOAuthService googleOAuth,
        GmailPubSubService gmailPubSub,
        LegacyIntegrationBridge legacyBridge,
        IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _mp = mp;
        _googleOAuth = googleOAuth;
        _gmailPubSub = gmailPubSub;
        _legacyBridge = legacyBridge;
        _httpClientFactory = httpClientFactory;
    }

    private static string? Mask(string? token) =>
        string.IsNullOrEmpty(token) ? null
            : "******************" + token[^Math.Min(6, token.Length)..];

    private static string? NormalizeValue(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        return raw.Trim();
    }

    // Strips BOM and surrounding whitespace so the stored value is always
    // safe to reuse in Authorization headers.
    private static string? SanitizeToken(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        return raw.TrimStart('\uFEFF').Trim();
    }

    private static LegacyIntegrationGroup ResolveUpdatedGroups(UpdateIntegrationSettingsDto dto)
    {
        var groups = LegacyIntegrationGroup.None;

        if (dto.GmailClientId != null ||
            dto.GmailClientSecret != null ||
            dto.GmailAccessToken != null ||
            dto.GmailRefreshToken != null ||
            dto.GmailConnected.HasValue)
        {
            groups |= LegacyIntegrationGroup.Gmail;
        }

        if (dto.PubsubProjectId != null ||
            dto.PubsubTopicName != null ||
            dto.PubsubServiceAccount != null)
        {
            groups |= LegacyIntegrationGroup.PubSub;
        }

        if (dto.WaPhoneNumberId != null ||
            dto.WaWabaId != null ||
            dto.WaAccessToken != null ||
            dto.WaVerifyToken != null ||
            dto.WaAppSecret != null ||
            dto.WaConnected.HasValue)
        {
            groups |= LegacyIntegrationGroup.WhatsApp;
        }

        if (dto.IgAccountId != null ||
            dto.IgPageId != null ||
            dto.IgAccessToken != null ||
            dto.IgConnected.HasValue)
        {
            groups |= LegacyIntegrationGroup.Instagram;
        }

        if (dto.AccessTokenProd != null ||
            dto.AccessTokenSandbox != null ||
            dto.PublicKey != null ||
            dto.SandboxMode.HasValue ||
            dto.Connected.HasValue)
        {
            groups |= LegacyIntegrationGroup.MercadoPago;
        }

        if (dto.GmailConnected == false)
            groups |= LegacyIntegrationGroup.PubSub;

        return groups;
    }

    private static IntegrationSettingsResponseDto ToIntegrationSettingsDto(Clinic clinic) => new()
    {
        GmailClientId = clinic.GmailClientId,
        GmailClientSecret = clinic.GmailClientSecret,
        GmailAddress = clinic.GmailAddress,
        GmailConnected = clinic.GmailConnected,
        PubsubProjectId = clinic.PubsubProjectId,
        PubsubTopicName = clinic.PubsubTopicName,
        PubsubServiceAccount = clinic.PubsubServiceAccount,
        PubsubSubscriptionName = clinic.PubsubSubscriptionName,
        PubsubWatchExpiresAt = clinic.PubsubWatchExpiresAt,
        PubsubConnected = clinic.GmailConnected &&
            !string.IsNullOrWhiteSpace(clinic.PubsubSubscriptionName) &&
            clinic.PubsubWatchExpiresAt.HasValue &&
            clinic.PubsubWatchExpiresAt.Value > DateTime.UtcNow,
        WaPhoneNumberId = clinic.WaPhoneNumberId,
        WaWabaId = clinic.WaWabaId,
        WaAccessToken = clinic.WaAccessToken,
        WaVerifyToken = clinic.WaVerifyToken,
        WaAppSecret = clinic.WaAppSecret,
        WaConnected = clinic.WaConnected,
        IgAccountId = clinic.IgAccountId,
        IgPageId = clinic.IgPageId,
        IgAccessToken = clinic.IgAccessToken,
        IgConnected = clinic.IgConnected,
        AccessTokenProdMasked = Mask(clinic.MpAccessTokenProd),
        AccessTokenSandboxMasked = Mask(clinic.MpAccessTokenSandbox),
        PublicKey = clinic.MpPublicKey,
        SandboxMode = clinic.MpSandboxMode,
        Connected = clinic.MpConnected,
    };

    private async Task<Clinic?> FindClinicAsync(
        Guid id,
        LegacyIntegrationGroup groups = LegacyIntegrationGroup.None,
        CancellationToken cancellationToken = default)
    {
        var clinic = await _db.Clinics.FindAsync([id], cancellationToken);
        if (clinic == null)
            return null;

        if (groups != LegacyIntegrationGroup.None &&
            await _legacyBridge.TryBackfillClinicAsync(clinic, groups, cancellationToken))
        {
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return clinic;
    }

    private static string? ExtractApiError(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.TryGetProperty("error", out var error))
            {
                if (error.ValueKind == JsonValueKind.String)
                    return error.GetString();

                if (error.ValueKind == JsonValueKind.Object &&
                    error.TryGetProperty("message", out var message) &&
                    message.ValueKind == JsonValueKind.String)
                {
                    return message.GetString();
                }
            }

            if (document.RootElement.TryGetProperty("message", out var rootMessage) &&
                rootMessage.ValueKind == JsonValueKind.String)
            {
                return rootMessage.GetString();
            }
        }
        catch
        {
        }

        return null;
    }

    private static string? ExtractString(string? json, params string[] path)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            using var document = JsonDocument.Parse(json);
            var current = document.RootElement;
            foreach (var segment in path)
            {
                if (!current.TryGetProperty(segment, out current))
                    return null;
            }

            return current.ValueKind == JsonValueKind.String ? current.GetString() : null;
        }
        catch
        {
            return null;
        }
    }

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
            return NotFound(new { message = "Clinica nao encontrada." });

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
            return NotFound(new { message = "Clinica nao encontrada." });

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

    [HttpGet("{id}/settings/integrations")]
    [Authorize]
    public async Task<ActionResult<IntegrationSettingsResponseDto>> GetIntegrations(Guid id)
    {
        var clinic = await FindClinicAsync(id, LegacyIntegrationGroup.All);
        if (clinic == null)
            return NotFound(new { message = "Clinica nao encontrada." });

        return Ok(ToIntegrationSettingsDto(clinic));
    }

    [HttpPut("{id}/settings/integrations")]
    [Authorize]
    public async Task<ActionResult<IntegrationSettingsResponseDto>> UpdateIntegrations(
        Guid id,
        [FromBody] UpdateIntegrationSettingsDto dto)
    {
        var groups = ResolveUpdatedGroups(dto);
        var clinic = await FindClinicAsync(id, groups);
        if (clinic == null)
            return NotFound(new { message = "Clinica nao encontrada." });

        if (dto.GmailClientId != null) clinic.GmailClientId = NormalizeValue(dto.GmailClientId);
        if (dto.GmailClientSecret != null) clinic.GmailClientSecret = NormalizeValue(dto.GmailClientSecret);
        if (dto.GmailAccessToken != null)
        {
            clinic.GmailAccessToken = SanitizeToken(dto.GmailAccessToken);
            if (dto.GmailAccessToken == "")
            {
                clinic.GmailTokenExpiresAt = null;
                clinic.GmailAddress = null;
            }
        }
        if (dto.GmailRefreshToken != null) clinic.GmailRefreshToken = NormalizeValue(dto.GmailRefreshToken);
        if (dto.GmailConnected.HasValue)
        {
            clinic.GmailConnected = dto.GmailConnected.Value;
            if (!dto.GmailConnected.Value)
            {
                clinic.GmailTokenExpiresAt = null;
                clinic.GmailAddress = null;
                clinic.PubsubSubscriptionName = null;
                clinic.PubsubPushEndpoint = null;
                clinic.PubsubWatchExpiresAt = null;
                clinic.PubsubVerificationToken = null;
                clinic.GmailWatchHistoryId = null;
            }
        }

        if (dto.PubsubProjectId != null) clinic.PubsubProjectId = NormalizeValue(dto.PubsubProjectId);
        if (dto.PubsubTopicName != null) clinic.PubsubTopicName = NormalizeValue(dto.PubsubTopicName);
        if (dto.PubsubServiceAccount != null) clinic.PubsubServiceAccount = NormalizeValue(dto.PubsubServiceAccount);

        if (dto.WaPhoneNumberId != null) clinic.WaPhoneNumberId = NormalizeValue(dto.WaPhoneNumberId);
        if (dto.WaWabaId != null) clinic.WaWabaId = NormalizeValue(dto.WaWabaId);
        if (dto.WaAccessToken != null) clinic.WaAccessToken = SanitizeToken(dto.WaAccessToken);
        if (dto.WaVerifyToken != null) clinic.WaVerifyToken = NormalizeValue(dto.WaVerifyToken);
        if (dto.WaAppSecret != null) clinic.WaAppSecret = NormalizeValue(dto.WaAppSecret);
        if (dto.WaConnected.HasValue) clinic.WaConnected = dto.WaConnected.Value;

        if (dto.IgAccountId != null) clinic.IgAccountId = NormalizeValue(dto.IgAccountId);
        if (dto.IgPageId != null) clinic.IgPageId = NormalizeValue(dto.IgPageId);
        if (dto.IgAccessToken != null) clinic.IgAccessToken = SanitizeToken(dto.IgAccessToken);
        if (dto.IgConnected.HasValue) clinic.IgConnected = dto.IgConnected.Value;

        if (dto.AccessTokenProd != null) clinic.MpAccessTokenProd = SanitizeToken(dto.AccessTokenProd);
        if (dto.AccessTokenSandbox != null) clinic.MpAccessTokenSandbox = SanitizeToken(dto.AccessTokenSandbox);
        if (dto.PublicKey != null) clinic.MpPublicKey = NormalizeValue(dto.PublicKey);
        if (dto.SandboxMode.HasValue) clinic.MpSandboxMode = dto.SandboxMode.Value;
        if (dto.Connected.HasValue) clinic.MpConnected = dto.Connected.Value;

        var hasPubSubConfig =
            !string.IsNullOrWhiteSpace(clinic.PubsubProjectId) &&
            !string.IsNullOrWhiteSpace(clinic.PubsubTopicName) &&
            !string.IsNullOrWhiteSpace(clinic.PubsubServiceAccount);

        if (!hasPubSubConfig)
        {
            clinic.PubsubSubscriptionName = null;
            clinic.PubsubPushEndpoint = null;
            clinic.PubsubWatchExpiresAt = null;
            clinic.PubsubVerificationToken = null;
            clinic.GmailWatchHistoryId = null;
        }

        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _legacyBridge.TrySyncClinicAsync(clinic, groups);

        return Ok(ToIntegrationSettingsDto(clinic));
    }

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

    [HttpPost("{id}/settings/integrations/gmail/watch")]
    [Authorize]
    public async Task<ActionResult> SetupGmailWatch(Guid id)
    {
        try
        {
            var result = await _gmailPubSub.EnsureWatchAsync(id, Request);
            return Ok(new
            {
                ok = true,
                message = "Pub/Sub do Gmail ativado com sucesso",
                historyId = result.HistoryId,
                expiresAt = result.ExpiresAt,
                subscriptionName = result.SubscriptionName,
            });
        }
        catch (GmailPubSubException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpDelete("{id}/settings/integrations/gmail/watch")]
    [Authorize]
    public async Task<ActionResult> StopGmailWatch(Guid id)
    {
        try
        {
            await _gmailPubSub.StopWatchAsync(id, deleteSubscription: true);
            return Ok(new
            {
                ok = true,
                message = "Pub/Sub do Gmail desativado com sucesso",
            });
        }
        catch (GmailPubSubException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpPost("{id}/settings/integrations/whatsapp/test")]
    [Authorize]
    public async Task<ActionResult> TestWhatsApp(Guid id)
    {
        var clinic = await FindClinicAsync(id, LegacyIntegrationGroup.WhatsApp);
        if (clinic == null)
            return NotFound(new { message = "Clinica nao encontrada." });

        if (string.IsNullOrWhiteSpace(clinic.WaAccessToken) || string.IsNullOrWhiteSpace(clinic.WaPhoneNumberId))
            return Ok(new { ok = false, message = "Token ou Phone Number ID nao configurados" });

        var client = _httpClientFactory.CreateClient();
        var url = $"https://graph.facebook.com/v19.0/{clinic.WaPhoneNumberId}?access_token={Uri.EscapeDataString(clinic.WaAccessToken)}";

        var response = await client.GetAsync(url);
        var body = await response.Content.ReadAsStringAsync();
        var error = ExtractApiError(body);

        if (!response.IsSuccessStatusCode || !string.IsNullOrWhiteSpace(error))
        {
            clinic.WaConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.WhatsApp);

            return Ok(new { ok = false, message = error ?? "Token invalido ou expirado" });
        }

        clinic.WaConnected = true;
        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.WhatsApp);

        return Ok(new
        {
            ok = true,
            message = "WhatsApp conectado com sucesso",
            detail = ExtractString(body, "display_phone_number") ?? ExtractString(body, "name"),
        });
    }

    [HttpPost("{id}/settings/integrations/instagram/test")]
    [Authorize]
    public async Task<ActionResult> TestInstagram(Guid id)
    {
        var clinic = await FindClinicAsync(id, LegacyIntegrationGroup.Instagram);
        if (clinic == null)
            return NotFound(new { message = "Clinica nao encontrada." });

        if (string.IsNullOrWhiteSpace(clinic.IgAccessToken) || string.IsNullOrWhiteSpace(clinic.IgPageId))
            return Ok(new { ok = false, message = "Token ou Page ID nao configurados" });

        var client = _httpClientFactory.CreateClient();
        var url = $"https://graph.facebook.com/v19.0/{clinic.IgPageId}?fields=name,instagram_business_account&access_token={Uri.EscapeDataString(clinic.IgAccessToken)}";

        var response = await client.GetAsync(url);
        var body = await response.Content.ReadAsStringAsync();
        var error = ExtractApiError(body);

        if (!response.IsSuccessStatusCode || !string.IsNullOrWhiteSpace(error))
        {
            clinic.IgConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.Instagram);

            return Ok(new { ok = false, message = error ?? "Token invalido ou expirado" });
        }

        clinic.IgConnected = true;
        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.Instagram);

        return Ok(new
        {
            ok = true,
            message = "Credenciais do Instagram validadas com sucesso",
            detail = ExtractString(body, "name"),
        });
    }

    [HttpPost("{id}/settings/integrations/mercadopago/test")]
    [Authorize]
    public async Task<ActionResult> TestMercadoPago(Guid id)
    {
        var clinic = await FindClinicAsync(id, LegacyIntegrationGroup.MercadoPago);
        if (clinic == null)
            return NotFound(new { message = "Clinica nao encontrada." });

        var token = clinic.MpSandboxMode
            ? clinic.MpAccessTokenSandbox
            : clinic.MpAccessTokenProd;

        if (string.IsNullOrWhiteSpace(token))
            token = null;

        try
        {
            var info = await _mp.TestConnectionAsync(token);

            clinic.MpConnected = true;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.MercadoPago);

            return Ok(new
            {
                ok = true,
                message = $"Conectado · {info.Email}",
                detail = $"Site: {info.SiteId} · Modo: {(clinic.MpSandboxMode ? "Sandbox" : "Producao")}",
            });
        }
        catch (Exception ex)
        {
            clinic.MpConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.MercadoPago);

            return Ok(new { ok = false, message = ex.Message });
        }
    }
}
