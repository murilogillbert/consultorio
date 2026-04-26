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
    private readonly AppDbContext         _db;
    private readonly MercadoPagoService   _mp;
    private readonly GoogleOAuthService   _googleOAuth;
    private readonly WhatsAppCloudService _whatsApp;
    private readonly InstagramService     _instagram;
    private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public ClinicsController(AppDbContext db, MercadoPagoService mp, GoogleOAuthService googleOAuth, WhatsAppCloudService whatsApp, InstagramService instagram)
    {
        _db = db;
        _mp = mp;
        _googleOAuth = googleOAuth;
        _whatsApp = whatsApp;
        _instagram = instagram;
    }

    private static string? Mask(string? token) =>
        string.IsNullOrEmpty(token) ? null
            : "••••••••••••••••••" + token[^Math.Min(6, token.Length)..];

    // Strips BOM, surrounding whitespace, and control/non-ASCII chars so the
    // stored value is always safe to use in an Authorization header.
    private static string? SanitizeToken(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var clean = new string(raw.TrimStart('\uFEFF').Trim()
            .Where(c => c >= 0x20 && c <= 0x7E)
            .ToArray());
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

    private IntegrationSettingsResponseDto ToIntegrationSettingsDto(Clinic clinic) => new()
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
        IgAccountId = clinic.IgAccountId,
        IgPageId = clinic.IgPageId,
        IgAccessTokenMasked = MaskSafe(clinic.IgAccessToken),
        IgAppSecretMasked = MaskSafe(clinic.IgAppSecret),
        IgVerifyTokenMasked = MaskSafe(clinic.IgVerifyToken),
        IgConnected = clinic.IgConnected,
        IgIntegrationMode = _instagram.GetEndpointInfo(clinic).Mode,
        IgGraphVersion = _instagram.GetEndpointInfo(clinic).GraphVersion,
        IgSendEndpoint = _instagram.GetEndpointInfo(clinic).SendEndpoint,
        IgSubscribeEndpoint = _instagram.GetEndpointInfo(clinic).SubscribeEndpoint,
        IgSubscribedAppsEndpoint = _instagram.GetEndpointInfo(clinic).SubscribedAppsEndpoint,
        IgUserProfileEndpoint = _instagram.GetEndpointInfo(clinic).UserProfileEndpoint,
        IgAllowMessageEditMidFallback = _instagram.GetEndpointInfo(clinic).AllowMessageEditMidFallback,
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

        // MP tokens: only overwrite if the client sent a non-null, non-masked value.
        // Empty string "" still clears the field. Sanitization strips BOM, whitespace
        // and non-ASCII to prevent "Request headers must contain only ASCII characters"
        // when the token is used later as a Bearer credential.
        if (dto.AccessTokenProd    != null && (dto.AccessTokenProd    == "" || !IsMasked(dto.AccessTokenProd)))
            clinic.MpAccessTokenProd    = SanitizeToken(dto.AccessTokenProd);
        if (dto.AccessTokenSandbox != null && (dto.AccessTokenSandbox == "" || !IsMasked(dto.AccessTokenSandbox)))
            clinic.MpAccessTokenSandbox = SanitizeToken(dto.AccessTokenSandbox);
        if (dto.PublicKey          != null) clinic.MpPublicKey          = dto.PublicKey == "" ? null : dto.PublicKey;
        if (dto.SandboxMode.HasValue)       clinic.MpSandboxMode        = dto.SandboxMode.Value;
        if (dto.Connected.HasValue)         clinic.MpConnected          = dto.Connected.Value;

        if (dto.WaPhoneNumberId != null) clinic.WaPhoneNumberId = dto.WaPhoneNumberId.Trim() == "" ? null : dto.WaPhoneNumberId.Trim();
        if (dto.WaWabaId        != null) clinic.WaWabaId        = dto.WaWabaId.Trim() == "" ? null : dto.WaWabaId.Trim();
        if (dto.WaAccessToken   != null && !IsMasked(dto.WaAccessToken)) clinic.WaAccessToken = WhatsAppCloudService.SanitizeSecret(dto.WaAccessToken);
        if (dto.WaVerifyToken   != null && !IsMasked(dto.WaVerifyToken)) clinic.WaVerifyToken = WhatsAppCloudService.SanitizeSecret(dto.WaVerifyToken);
        if (dto.WaAppSecret     != null && !IsMasked(dto.WaAppSecret))   clinic.WaAppSecret   = WhatsAppCloudService.SanitizeSecret(dto.WaAppSecret);
        if (dto.WaConnected.HasValue) clinic.WaConnected = dto.WaConnected.Value;

        if (dto.IgAccountId   != null) clinic.IgAccountId  = dto.IgAccountId.Trim()  == "" ? null : dto.IgAccountId.Trim();
        if (dto.IgPageId      != null) clinic.IgPageId     = dto.IgPageId.Trim()     == "" ? null : dto.IgPageId.Trim();
        if (dto.IgAccessToken != null && !IsMasked(dto.IgAccessToken))
            clinic.IgAccessToken = WhatsAppCloudService.SanitizeSecret(dto.IgAccessToken);
        if (dto.IgAppSecret != null && !IsMasked(dto.IgAppSecret))
            clinic.IgAppSecret = WhatsAppCloudService.SanitizeSecret(dto.IgAppSecret);
        if (dto.IgVerifyToken != null && !IsMasked(dto.IgVerifyToken))
            clinic.IgVerifyToken = WhatsAppCloudService.SanitizeSecret(dto.IgVerifyToken);
        if (dto.IgConnected.HasValue) clinic.IgConnected = dto.IgConnected.Value;

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
            return NotFound(new { message = "Clínica não encontrada." });

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

    [HttpPost("{id}/settings/integrations/instagram/test")]
    [Authorize]
    public async Task<ActionResult> TestInstagram(Guid id)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "Clínica não encontrada." });

        if (string.IsNullOrWhiteSpace(clinic.IgAppSecret) || string.IsNullOrWhiteSpace(clinic.IgVerifyToken))
        {
            clinic.IgConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return StatusCode(StatusCodes.Status422UnprocessableEntity, new
            {
                ok = false,
                message = "Instagram parcialmente configurado. Salve também App Secret e Verify Token para o webhook receber DMs.",
            });
        }

        try
        {
            var info = await _instagram.TestConnectionAsync(id);

            // Só auto-popula IgAccountId se ele ainda não foi definido no banco.
            // Quando já existe um valor o usuário pode ter feito override manual —
            // o entry.id que chega no webhook pode diferir do instagram_business_account.id
            // retornado pela API (apps diferentes enxergam IDs diferentes para a mesma conta).
            if (!string.IsNullOrWhiteSpace(info.IgAccountId) && string.IsNullOrWhiteSpace(clinic.IgAccountId))
                clinic.IgAccountId = info.IgAccountId;

            // ── Auto-subscribe da página ao app ────────────────────────────────
            // A Meta exige 2 etapas: (1) webhook do App (configurado no painel) e
            // (2) Page → subscribed_apps. Sem o #2, as DMs nunca chegam. Então
            // fazemos a #2 automaticamente aqui e reportamos o resultado.
            var subscription = await _instagram.SubscribeToAppDetailedAsync(id);
            var subOk = subscription.Ok;
            var subDetail = subscription.Detail;
            var subFields = subscription.SubscribedFields;
            var endpoints = _instagram.GetEndpointInfo(clinic);

            clinic.IgConnected = true;
            clinic.UpdatedAt   = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            string message;
            if (!string.IsNullOrWhiteSpace(info.IgUsername) && !string.IsNullOrWhiteSpace(info.PageName))
                message = $"Instagram conectado · @{info.IgUsername} · {info.PageName}";
            else if (!string.IsNullOrWhiteSpace(info.IgUsername))
                message = $"Instagram conectado · @{info.IgUsername}";
            else if (!string.IsNullOrWhiteSpace(info.PageName))
                message = $"Instagram conectado · {info.PageName}";
            else
                message = "Instagram conectado com sucesso";

            var hasMessages = subFields.Any(f => string.Equals(f, "messages", StringComparison.OrdinalIgnoreCase));
            var subsBlock = subOk
                ? (hasMessages
                    ? $"✓ Subscrição ativa. Campos: {string.Join(", ", subFields)}"
                    : $"⚠ Página subscrita, mas sem campo 'messages' ativo. Resposta: {subDetail}")
                : $"⚠ Conexão OK, mas falhou subscrever a página ao app: {subDetail}. No Meta Developer Portal, em Webhooks → Page, adicione esta Página e marque 'messages', 'messaging_postbacks'.";

            return Ok(new
            {
                ok      = subOk && hasMessages,
                message,
                endpoints,
                detail  = $"Page ID: {info.PageId} · {subsBlock}",
                subscription = new
                {
                    success = subOk,
                    hasMessages,
                    detail = subDetail,
                    fields = subFields,
                    subscribeEndpoint = subscription.SubscribeEndpoint,
                    subscribedAppsEndpoint = subscription.SubscribedAppsEndpoint,
                },
            });
        }
        catch (InstagramException ex)
        {
            clinic.IgConnected = false;
            clinic.UpdatedAt   = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return StatusCode(ex.StatusCode, new { ok = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            clinic.IgConnected = false;
            clinic.UpdatedAt   = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { ok = false, message = ex.Message });
        }
    }
}
