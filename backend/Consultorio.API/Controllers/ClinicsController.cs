using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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
    private static readonly HttpClient _pubSubHttp = new();
    private const string PubSubScope = "https://www.googleapis.com/auth/pubsub";

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

    private static string? EmptyToNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static string? MaskServiceAccount(string? rawJson)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
            return null;

        var account = ParsePubSubServiceAccount(rawJson, out _);
        var suffix = string.IsNullOrWhiteSpace(account?.ClientEmail) ? "configurado" : account.ClientEmail;
        return $"******************{suffix}";
    }

    private static PubSubServiceAccount? ParsePubSubServiceAccount(string? rawJson, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(rawJson))
        {
            error = "Service Account Key (JSON) e obrigatoria.";
            return null;
        }

        try
        {
            var account = JsonSerializer.Deserialize<PubSubServiceAccount>(
                rawJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (account == null ||
                !string.Equals(account.Type, "service_account", StringComparison.OrdinalIgnoreCase) ||
                string.IsNullOrWhiteSpace(account.ProjectId) ||
                string.IsNullOrWhiteSpace(account.PrivateKey) ||
                string.IsNullOrWhiteSpace(account.ClientEmail))
            {
                error = "JSON da service account incompleto ou invalido.";
                return null;
            }

            return account;
        }
        catch
        {
            error = "JSON da service account invalido.";
            return null;
        }
    }

    private static string NormalizeTopicName(string topicName, string projectId)
    {
        var trimmed = topicName.Trim();
        var prefix = $"projects/{projectId}/topics/";
        return trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? trimmed[prefix.Length..]
            : trimmed;
    }

    private static string BuildTopicResource(string projectId, string topicName)
    {
        var normalizedTopic = NormalizeTopicName(topicName, projectId);
        return $"projects/{Uri.EscapeDataString(projectId)}/topics/{Uri.EscapeDataString(normalizedTopic)}";
    }

    private static async Task<string> CreatePubSubAccessTokenAsync(PubSubServiceAccount account)
    {
        using var rsa = RSA.Create();
        rsa.ImportFromPem(account.PrivateKey);

        var credentials = new SigningCredentials(
            new RsaSecurityKey(rsa) { KeyId = account.PrivateKeyId },
            SecurityAlgorithms.RsaSha256);

        var now = DateTime.UtcNow;
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = account.ClientEmail,
            Audience = "https://oauth2.googleapis.com/token",
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddMinutes(55),
            Subject = new ClaimsIdentity([new Claim("scope", PubSubScope)]),
            SigningCredentials = credentials,
        };

        var handler = new JwtSecurityTokenHandler();
        var assertion = handler.WriteToken(handler.CreateToken(descriptor));

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = assertion,
            })
        };

        using var response = await _pubSubHttp.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        var token = JsonSerializer.Deserialize<GoogleAccessTokenResponse>(body);

        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(token?.AccessToken))
            throw new InvalidOperationException(ExtractGoogleError(body) ?? "Falha ao autenticar a service account do Pub/Sub.");

        return token.AccessToken;
    }

    private static string? ExtractGoogleError(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (root.TryGetProperty("error_description", out var errorDescription) &&
                errorDescription.ValueKind == JsonValueKind.String)
                return errorDescription.GetString();

            if (root.TryGetProperty("error", out var error))
            {
                if (error.ValueKind == JsonValueKind.String)
                    return error.GetString();

                if (error.ValueKind == JsonValueKind.Object &&
                    error.TryGetProperty("message", out var message) &&
                    message.ValueKind == JsonValueKind.String)
                    return message.GetString();
            }
        }
        catch
        {
        }

        return null;
    }

    private IntegrationSettingsResponseDto ToIntegrationSettingsDto(Clinic clinic)
    {
        var mode    = _instagram.Mode;
        var ownerId = MetaInstagramMessagingClient.ResolveOwnerId(mode, clinic.IgAccountId, clinic.IgPageId);
        var hasOwner = !string.IsNullOrWhiteSpace(ownerId);

        return new()
        {
            GmailClientId = clinic.GmailClientId,
            GmailClientSecret = clinic.GmailClientSecret,
            GmailConnected = clinic.GmailConnected,
            PubSubProjectId = clinic.PubSubProjectId,
            PubSubTopicName = clinic.PubSubTopicName,
            PubSubServiceAccountMasked = MaskServiceAccount(clinic.PubSubServiceAccount),
            PubSubServiceAccountConfigured = !string.IsNullOrWhiteSpace(clinic.PubSubServiceAccount),
            PubSubConnected = clinic.PubSubConnected,
            PubSubWatchExpiresAt = clinic.PubSubWatchExpiresAt,
            GmailWatchHistoryId = clinic.GmailWatchHistoryId,
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
            IgMode             = mode.ToString(),
            IgGraphVersion     = _instagram.Client.GraphVersion,
            IgOwnerId          = hasOwner ? ownerId : null,
            IgSendEndpoint     = hasOwner ? _instagram.Client.SendEndpoint(mode, ownerId) : null,
            IgSubscribeEndpoint= hasOwner ? _instagram.Client.SubscribeEndpoint(mode, ownerId) : null,
            IgConfirmEndpoint  = hasOwner ? _instagram.Client.ConfirmSubscribedAppsEndpoint(mode, ownerId) : null,
        };
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

        var pubSubSettingsChanged = false;
        if (dto.PubSubProjectId != null)
        {
            var value = EmptyToNull(dto.PubSubProjectId);
            if (!string.Equals(clinic.PubSubProjectId, value, StringComparison.Ordinal))
            {
                clinic.PubSubProjectId = value;
                pubSubSettingsChanged = true;
            }
        }
        if (dto.PubSubTopicName != null)
        {
            var value = EmptyToNull(dto.PubSubTopicName);
            if (!string.Equals(clinic.PubSubTopicName, value, StringComparison.Ordinal))
            {
                clinic.PubSubTopicName = value;
                pubSubSettingsChanged = true;
            }
        }
        if (dto.PubSubServiceAccount != null && !IsMasked(dto.PubSubServiceAccount))
        {
            var normalizedServiceAccount = EmptyToNull(dto.PubSubServiceAccount);
            if (normalizedServiceAccount != null && ParsePubSubServiceAccount(normalizedServiceAccount, out var serviceAccountError) == null)
                return BadRequest(new { message = serviceAccountError });

            if (!string.Equals(clinic.PubSubServiceAccount, normalizedServiceAccount, StringComparison.Ordinal))
            {
                clinic.PubSubServiceAccount = normalizedServiceAccount;
                pubSubSettingsChanged = true;
            }
        }
        if (dto.PubSubConnected.HasValue) clinic.PubSubConnected = dto.PubSubConnected.Value;
        else if (pubSubSettingsChanged) clinic.PubSubConnected = false;

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

    [HttpPost("{id}/settings/integrations/pubsub/test")]
    [Authorize]
    public async Task<ActionResult> TestPubSub(Guid id)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic == null)
            return NotFound(new { message = "Clinica nao encontrada." });

        if (string.IsNullOrWhiteSpace(clinic.PubSubProjectId) ||
            string.IsNullOrWhiteSpace(clinic.PubSubTopicName) ||
            string.IsNullOrWhiteSpace(clinic.PubSubServiceAccount))
        {
            clinic.PubSubConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return StatusCode(StatusCodes.Status422UnprocessableEntity, new
            {
                message = "Salve Project ID, nome do topico e JSON da service account antes de testar.",
            });
        }

        var serviceAccount = ParsePubSubServiceAccount(clinic.PubSubServiceAccount, out var serviceAccountError);
        if (serviceAccount == null)
        {
            clinic.PubSubConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return BadRequest(new { message = serviceAccountError });
        }

        try
        {
            var accessToken = await CreatePubSubAccessTokenAsync(serviceAccount);
            var topicResource = BuildTopicResource(clinic.PubSubProjectId, clinic.PubSubTopicName);

            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"https://pubsub.googleapis.com/v1/{topicResource}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var response = await _pubSubHttp.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                clinic.PubSubConnected = false;
                clinic.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                var message = response.StatusCode == System.Net.HttpStatusCode.NotFound
                    ? "Topico Pub/Sub nao encontrado. Confirme o Project ID e o nome do topico."
                    : ExtractGoogleError(body) ?? "Falha ao validar o topico Pub/Sub.";

                return StatusCode((int)response.StatusCode, new { message });
            }

            clinic.PubSubConnected = true;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                ok = true,
                message = "Pub/Sub conectado com sucesso",
                detail = $"{clinic.PubSubProjectId}/{NormalizeTopicName(clinic.PubSubTopicName, clinic.PubSubProjectId)}",
            });
        }
        catch (Exception ex)
        {
            clinic.PubSubConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return BadRequest(new { message = ex.Message });
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

        try
        {
            var info = await _instagram.TestConnectionAsync(id);
            var webhookConfigured =
                !string.IsNullOrWhiteSpace(clinic.IgAppSecret) &&
                !string.IsNullOrWhiteSpace(clinic.IgVerifyToken);

            // Só auto-popula IgAccountId se ele ainda não foi definido no banco.
            // Quando já existe um valor o usuário pode ter feito override manual —
            // o entry.id que chega no webhook pode diferir do instagram_business_account.id
            // retornado pela API (apps diferentes enxergam IDs diferentes para a mesma conta).
            if (!string.IsNullOrWhiteSpace(info.IgAccountId) && string.IsNullOrWhiteSpace(clinic.IgAccountId))
                clinic.IgAccountId = info.IgAccountId;

            string message;
            if (!string.IsNullOrWhiteSpace(info.IgUsername) && !string.IsNullOrWhiteSpace(info.PageName))
                message = $"Instagram conectado · @{info.IgUsername} · {info.PageName}";
            else if (!string.IsNullOrWhiteSpace(info.IgUsername))
                message = $"Instagram conectado · @{info.IgUsername}";
            else if (!string.IsNullOrWhiteSpace(info.PageName))
                message = $"Instagram conectado · {info.PageName}";
            else
                message = "Instagram conectado com sucesso";

            var modeLabel = info.Mode.ToString();
            var ownerLabel = string.IsNullOrWhiteSpace(info.OwnerId) ? "(sem owner)" : info.OwnerId;

            if (!webhookConfigured)
            {
                clinic.IgConnected = false;
                clinic.UpdatedAt   = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                return Ok(new
                {
                    ok = false,
                    message = "Conta/token do Instagram validado, mas webhook incompleto",
                    detail = $"Modo: {modeLabel} · Owner: {ownerLabel} · faltam App Secret e/ou Verify Token para validar assinatura e receber DMs.",
                    mode = modeLabel,
                    ownerId = info.OwnerId,
                    endpoints = new
                    {
                        send      = info.SendEndpoint,
                        subscribe = string.IsNullOrWhiteSpace(info.OwnerId) ? "" : _instagram.Client.SubscribeEndpoint(info.Mode, info.OwnerId),
                        confirm   = string.IsNullOrWhiteSpace(info.OwnerId) ? "" : _instagram.Client.ConfirmSubscribedAppsEndpoint(info.Mode, info.OwnerId),
                    },
                    validation = new
                    {
                        accountOk = true,
                        webhookConfigured = false,
                    },
                });
            }

            // ── Auto-subscribe da página/conta ao app ──────────────────────────
            // A Meta exige 2 etapas: (1) webhook do App (configurado no painel) e
            // (2) {owner} → subscribed_apps. Sem o #2, as DMs nunca chegam.
            var (subOk, subDetail, subFields, subscribeUrl, confirmUrl, ownerId) =
                await _instagram.SubscribePageToAppAsync(id);

            var hasMessages = subFields.Any(f => string.Equals(f, "messages", StringComparison.OrdinalIgnoreCase));
            clinic.IgConnected = subOk && hasMessages;
            clinic.UpdatedAt   = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var subsBlock = subOk
                ? (hasMessages
                    ? $"✓ Subscrição ativa. Campos: {string.Join(", ", subFields)}"
                    : $"⚠ Subscrito, mas sem campo 'messages' ativo. Resposta: {subDetail}")
                : $"⚠ Conexão OK, mas falhou subscrever ao app: {subDetail}. No Meta Developer Portal, em Webhooks, marque 'messages' e 'messaging_postbacks'.";
            ownerLabel = string.IsNullOrWhiteSpace(ownerId) ? "(sem owner)" : ownerId;

            return Ok(new
            {
                ok      = subOk && hasMessages,
                message,
                detail  = $"Modo: {modeLabel} · Owner: {ownerLabel} · Page ID: {info.PageId} · {subsBlock}",
                mode = modeLabel,
                ownerId,
                endpoints = new
                {
                    send      = info.SendEndpoint,
                    subscribe = subscribeUrl,
                    confirm   = confirmUrl,
                },
                subscription = new
                {
                    success = subOk,
                    hasMessages,
                    detail = subDetail,
                    fields = subFields,
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

    private sealed class PubSubServiceAccount
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("project_id")]
        public string? ProjectId { get; set; }

        [JsonPropertyName("private_key_id")]
        public string? PrivateKeyId { get; set; }

        [JsonPropertyName("private_key")]
        public string? PrivateKey { get; set; }

        [JsonPropertyName("client_email")]
        public string? ClientEmail { get; set; }
    }

    private sealed class GoogleAccessTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }
    }
}
