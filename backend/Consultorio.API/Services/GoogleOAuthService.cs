using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Services;

public class GoogleOAuthService
{
    private const string FallbackReturnPath = "/admin/configuracoes?tab=integrations";
    private static readonly string[] GmailScopes =
    [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
    ];

    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly HttpClient _http;
    private readonly LegacyIntegrationBridge _legacyBridge;

    public GoogleOAuthService(
        AppDbContext db,
        IConfiguration config,
        HttpClient http,
        LegacyIntegrationBridge legacyBridge)
    {
        _db = db;
        _config = config;
        _http = http;
        _legacyBridge = legacyBridge;
    }

    private async Task<Clinic?> LoadClinicWithLegacyAsync(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId);
        if (clinic == null)
            return null;

        if (await _legacyBridge.TryBackfillClinicAsync(clinic, LegacyIntegrationGroup.Gmail))
        {
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return clinic;
    }

    public async Task<(string AuthUrl, string RedirectUri)> CreateAuthorizationUrlAsync(
        HttpRequest request,
        Guid clinicId,
        Guid userId,
        string? returnUrl)
    {
        if (clinicId == Guid.Empty)
            throw new GoogleOAuthException("clinicId é obrigatório para iniciar a autenticação do Gmail", StatusCodes.Status400BadRequest);

        var hasAccess = await _db.SystemUsers.AnyAsync(su => su.ClinicId == clinicId && su.UserId == userId);
        if (!hasAccess)
            throw new GoogleOAuthException("Você não tem acesso a esta clínica", StatusCodes.Status403Forbidden);

        var clinic = await LoadClinicWithLegacyAsync(clinicId);
        if (clinic == null)
            throw new GoogleOAuthException("Clínica não encontrada", StatusCodes.Status404NotFound);

        if (string.IsNullOrWhiteSpace(clinic.GmailClientId) || string.IsNullOrWhiteSpace(clinic.GmailClientSecret))
            throw new GoogleOAuthException("Salve Client ID e Client Secret do Gmail antes de autenticar", StatusCodes.Status422UnprocessableEntity);

        var redirectUri = $"{ResolveRequestBaseUrl(request)}/api/auth/google/callback";
        var allowedOrigin = ResolveAllowedOrigin(request, returnUrl);
        var safeReturnUrl = BuildSafeReturnUrl(returnUrl, allowedOrigin);
        var stateToken = CreateStateToken(new GoogleOAuthStatePayload
        {
            ClinicId = clinicId,
            UserId = userId,
            ReturnUrl = safeReturnUrl,
            AllowedOrigin = allowedOrigin,
        });

        var query = new Dictionary<string, string>
        {
            ["client_id"] = clinic.GmailClientId,
            ["redirect_uri"] = redirectUri,
            ["response_type"] = "code",
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["include_granted_scopes"] = "true",
            ["scope"] = string.Join(' ', GmailScopes),
            ["state"] = stateToken,
        };

        var authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?{BuildQueryString(query)}";
        return (authUrl, redirectUri);
    }

    public async Task<string> HandleCallbackAsync(HttpRequest request)
    {
        var stateToken = request.Query["state"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(stateToken))
            throw new GoogleOAuthException("State OAuth ausente", StatusCodes.Status400BadRequest);

        var state = ReadStateToken(stateToken);
        var safeReturnUrl = BuildSafeReturnUrl(state.ReturnUrl, state.AllowedOrigin);

        var googleError = request.Query["error"].FirstOrDefault();
        var googleErrorDescription = request.Query["error_description"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(googleError))
        {
            return AppendRedirectParams(safeReturnUrl, new Dictionary<string, string>
            {
                ["tab"] = "integrations",
                ["gmail_oauth"] = "error",
                ["gmail_message"] = googleErrorDescription ?? googleError,
            });
        }

        var code = request.Query["code"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(code))
        {
            return AppendRedirectParams(safeReturnUrl, new Dictionary<string, string>
            {
                ["tab"] = "integrations",
                ["gmail_oauth"] = "error",
                ["gmail_message"] = "Código OAuth do Google ausente",
            });
        }

        try
        {
            var hasAccess = await _db.SystemUsers.AnyAsync(su => su.ClinicId == state.ClinicId && su.UserId == state.UserId);
            if (!hasAccess)
                throw new GoogleOAuthException("Você não tem mais acesso a esta clínica", StatusCodes.Status403Forbidden);

            var clinic = await LoadClinicWithLegacyAsync(state.ClinicId);
            if (clinic == null)
                throw new GoogleOAuthException("Clínica não encontrada", StatusCodes.Status404NotFound);

            if (string.IsNullOrWhiteSpace(clinic.GmailClientId) || string.IsNullOrWhiteSpace(clinic.GmailClientSecret))
                throw new GoogleOAuthException("Credenciais OAuth do Gmail não configuradas para esta clínica", StatusCodes.Status422UnprocessableEntity);

            var redirectUri = $"{ResolveRequestBaseUrl(request)}/api/auth/google/callback";
            var tokens = await ExchangeCodeForTokensAsync(code, clinic.GmailClientId, clinic.GmailClientSecret, redirectUri);

            clinic.GmailAccessToken = tokens.AccessToken;
            clinic.GmailRefreshToken = !string.IsNullOrWhiteSpace(tokens.RefreshToken)
                ? tokens.RefreshToken
                : clinic.GmailRefreshToken;
            clinic.GmailTokenExpiresAt = tokens.ExpiresIn.HasValue
                ? DateTime.UtcNow.AddSeconds(tokens.ExpiresIn.Value)
                : null;
            try
            {
                clinic.GmailAddress = await GetProfileEmailAsync(tokens.AccessToken);
            }
            catch
            {
            }
            clinic.GmailConnected = true;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.Gmail);

            return AppendRedirectParams(safeReturnUrl, new Dictionary<string, string>
            {
                ["tab"] = "integrations",
                ["gmail_oauth"] = "success",
                ["gmail_message"] = "Conta Google conectada com sucesso",
            });
        }
        catch (GoogleOAuthException ex)
        {
            await MarkClinicDisconnectedAsync(state.ClinicId);
            return AppendRedirectParams(safeReturnUrl, new Dictionary<string, string>
            {
                ["tab"] = "integrations",
                ["gmail_oauth"] = "error",
                ["gmail_message"] = ex.Message,
            });
        }
        catch
        {
            await MarkClinicDisconnectedAsync(state.ClinicId);
            return AppendRedirectParams(safeReturnUrl, new Dictionary<string, string>
            {
                ["tab"] = "integrations",
                ["gmail_oauth"] = "error",
                ["gmail_message"] = "Falha ao concluir a autenticação do Gmail",
            });
        }
    }

    public async Task<string> GetValidAccessTokenAsync(Guid clinicId)
    {
        var clinic = await LoadClinicWithLegacyAsync(clinicId);
        if (clinic == null)
            throw new GoogleOAuthException("Clínica não encontrada", StatusCodes.Status404NotFound);

        if (string.IsNullOrWhiteSpace(clinic.GmailClientId) || string.IsNullOrWhiteSpace(clinic.GmailClientSecret))
            throw new GoogleOAuthException("Credenciais do Gmail não configuradas", StatusCodes.Status422UnprocessableEntity);

        if (!string.IsNullOrWhiteSpace(clinic.GmailAccessToken) &&
            (!clinic.GmailTokenExpiresAt.HasValue || clinic.GmailTokenExpiresAt.Value > DateTime.UtcNow.AddMinutes(1)))
        {
            return clinic.GmailAccessToken;
        }

        if (string.IsNullOrWhiteSpace(clinic.GmailRefreshToken))
            throw new GoogleOAuthException("Gmail ainda não autenticado. Faça a conexão OAuth primeiro.", StatusCodes.Status422UnprocessableEntity);

        var refreshed = await RefreshAccessTokenAsync(
            clinic.GmailClientId,
            clinic.GmailClientSecret,
            clinic.GmailRefreshToken);

        clinic.GmailAccessToken = refreshed.AccessToken;
        clinic.GmailTokenExpiresAt = refreshed.ExpiresIn.HasValue
            ? DateTime.UtcNow.AddSeconds(refreshed.ExpiresIn.Value)
            : null;
        clinic.GmailConnected = true;
        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.Gmail);

        return refreshed.AccessToken!;
    }

    public async Task<string> TestConnectionAsync(Guid clinicId)
    {
        var clinic = await LoadClinicWithLegacyAsync(clinicId);
        if (clinic == null)
            throw new GoogleOAuthException("Clínica não encontrada", StatusCodes.Status404NotFound);

        if (string.IsNullOrWhiteSpace(clinic.GmailClientId) || string.IsNullOrWhiteSpace(clinic.GmailClientSecret))
            throw new GoogleOAuthException("Salve o Client ID e Client Secret antes de testar", StatusCodes.Status422UnprocessableEntity);

        if (string.IsNullOrWhiteSpace(clinic.GmailAccessToken) && string.IsNullOrWhiteSpace(clinic.GmailRefreshToken))
            throw new GoogleOAuthException("Gmail salvo mas ainda não autenticado. Clique em \"Salvar e Autenticar\" para concluir o OAuth.", StatusCodes.Status422UnprocessableEntity);

        var accessToken = await GetValidAccessTokenAsync(clinicId);
        using var requestMessage = new HttpRequestMessage(HttpMethod.Get, "https://gmail.googleapis.com/gmail/v1/users/me/profile");
        requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _http.SendAsync(requestMessage);
        var body = await response.Content.ReadAsStringAsync();
        var profile = Deserialize<GoogleProfileResponse>(body);

        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(profile?.EmailAddress))
        {
            clinic.GmailConnected = false;
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.Gmail);

            throw new GoogleOAuthException(
                ExtractGoogleError(body) ?? "Token inválido ou expirado",
                StatusCodes.Status400BadRequest);
        }

        clinic.GmailConnected = true;
        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.Gmail);

        return profile.EmailAddress;
    }

    public async Task<string?> GetProfileEmailAsync(Guid clinicId)
    {
        var accessToken = await GetValidAccessTokenAsync(clinicId);
        return await GetProfileEmailAsync(accessToken);
    }

    private async Task<string?> GetProfileEmailAsync(string accessToken)
    {
        using var requestMessage = new HttpRequestMessage(HttpMethod.Get, "https://gmail.googleapis.com/gmail/v1/users/me/profile");
        requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _http.SendAsync(requestMessage);
        var body = await response.Content.ReadAsStringAsync();
        var profile = Deserialize<GoogleProfileResponse>(body);

        if (!response.IsSuccessStatusCode)
        {
            throw new GoogleOAuthException(
                ExtractGoogleError(body) ?? "Falha ao consultar o perfil do Gmail",
                StatusCodes.Status400BadRequest);
        }

        return profile?.EmailAddress;
    }

    private async Task<TokenResponse> ExchangeCodeForTokensAsync(string code, string clientId, string clientSecret, string redirectUri)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code",
            })
        };

        var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        var token = Deserialize<TokenResponse>(body);

        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(token?.AccessToken))
            throw new GoogleOAuthException(
                ExtractGoogleError(body) ?? "Falha ao trocar o código OAuth do Google",
                StatusCodes.Status400BadRequest);

        return token;
    }

    private async Task<TokenResponse> RefreshAccessTokenAsync(string clientId, string clientSecret, string refreshToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["refresh_token"] = refreshToken,
                ["grant_type"] = "refresh_token",
            })
        };

        var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        var token = Deserialize<TokenResponse>(body);

        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(token?.AccessToken))
            throw new GoogleOAuthException(
                ExtractGoogleError(body) ?? "Falha ao renovar o token do Gmail",
                StatusCodes.Status400BadRequest);

        return token;
    }

    private string CreateStateToken(GoogleOAuthStatePayload payload)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("type", "gmail_oauth"),
            new("clinicId", payload.ClinicId.ToString()),
            new("userId", payload.UserId.ToString()),
        };

        if (!string.IsNullOrWhiteSpace(payload.ReturnUrl))
            claims.Add(new Claim("returnUrl", payload.ReturnUrl));
        if (!string.IsNullOrWhiteSpace(payload.AllowedOrigin))
            claims.Add(new Claim("allowedOrigin", payload.AllowedOrigin));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private GoogleOAuthStatePayload ReadStateToken(string stateToken)
    {
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _config["Jwt:Issuer"],
            ValidAudience = _config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };

        var handler = new JwtSecurityTokenHandler();
        var principal = handler.ValidateToken(stateToken, parameters, out _);

        var type = principal.FindFirst("type")?.Value;
        if (type != "gmail_oauth")
            throw new GoogleOAuthException("State OAuth inválido", StatusCodes.Status400BadRequest);

        if (!Guid.TryParse(principal.FindFirst("clinicId")?.Value, out var clinicId))
            throw new GoogleOAuthException("State OAuth sem clínica válida", StatusCodes.Status400BadRequest);

        if (!Guid.TryParse(principal.FindFirst("userId")?.Value, out var userId))
            throw new GoogleOAuthException("State OAuth sem usuário válido", StatusCodes.Status400BadRequest);

        return new GoogleOAuthStatePayload
        {
            ClinicId = clinicId,
            UserId = userId,
            ReturnUrl = principal.FindFirst("returnUrl")?.Value,
            AllowedOrigin = principal.FindFirst("allowedOrigin")?.Value,
        };
    }

    private static string ResolveRequestBaseUrl(HttpRequest request)
    {
        var forwardedProto = request.Headers["X-Forwarded-Proto"].FirstOrDefault();
        var forwardedHost = request.Headers["X-Forwarded-Host"].FirstOrDefault();

        var protocol = (string.IsNullOrWhiteSpace(forwardedProto) ? request.Scheme : forwardedProto)
            .Split(',')[0]
            .Trim();
        var hostValue = string.IsNullOrWhiteSpace(forwardedHost) ? request.Host.Value : forwardedHost;
        var host = (hostValue ?? string.Empty)
            .Split(',')[0]
            .Trim();

        if (string.IsNullOrWhiteSpace(host))
            throw new GoogleOAuthException("Não foi possível determinar a URL pública da API", StatusCodes.Status500InternalServerError);

        return $"{protocol}://{host}";
    }

    private static string? ResolveAllowedOrigin(HttpRequest request, string? returnUrl)
    {
        var origin = request.Headers["Origin"].FirstOrDefault();
        if (Uri.TryCreate(origin, UriKind.Absolute, out var originUri))
            return originUri.GetLeftPart(UriPartial.Authority);

        var referer = request.Headers["Referer"].FirstOrDefault();
        if (Uri.TryCreate(referer, UriKind.Absolute, out var refererUri))
            return refererUri.GetLeftPart(UriPartial.Authority);

        if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var returnUri))
            return returnUri.GetLeftPart(UriPartial.Authority);

        return null;
    }

    private static string BuildSafeReturnUrl(string? returnUrl, string? allowedOrigin)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
            return !string.IsNullOrWhiteSpace(allowedOrigin) ? $"{allowedOrigin}{FallbackReturnPath}" : FallbackReturnPath;

        if (returnUrl.StartsWith('/'))
            return !string.IsNullOrWhiteSpace(allowedOrigin) ? $"{allowedOrigin}{returnUrl}" : returnUrl;

        if (!Uri.TryCreate(returnUrl, UriKind.Absolute, out var parsed))
            return !string.IsNullOrWhiteSpace(allowedOrigin) ? $"{allowedOrigin}{FallbackReturnPath}" : FallbackReturnPath;

        if (!string.IsNullOrWhiteSpace(allowedOrigin) &&
            !string.Equals(parsed.GetLeftPart(UriPartial.Authority), allowedOrigin, StringComparison.OrdinalIgnoreCase))
        {
            return $"{allowedOrigin}{FallbackReturnPath}";
        }

        return parsed.ToString();
    }

    private static string AppendRedirectParams(string targetUrl, Dictionary<string, string> parameters)
    {
        var isAbsolute = Uri.TryCreate(targetUrl, UriKind.Absolute, out var absoluteUri);
        var uri = isAbsolute && absoluteUri != null
            ? absoluteUri
            : new Uri(new Uri("http://local"), targetUrl);

        var builder = new UriBuilder(uri);
        var queryValues = ParseQuery(builder.Query);
        foreach (var (key, value) in parameters)
            queryValues[key] = value;

        builder.Query = BuildQueryString(queryValues);
        if (isAbsolute)
            return builder.Uri.ToString();

        return $"{builder.Path}{(string.IsNullOrWhiteSpace(builder.Query) ? "" : $"?{builder.Query.TrimStart('?')}")}{builder.Fragment}";
    }

    private static Dictionary<string, string> ParseQuery(string? query)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(query))
            return values;

        foreach (var segment in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = segment.Split('=', 2);
            var key = Uri.UnescapeDataString(parts[0]);
            var value = parts.Length > 1 ? Uri.UnescapeDataString(parts[1]) : "";
            values[key] = value;
        }

        return values;
    }

    private static string BuildQueryString(IReadOnlyDictionary<string, string> parameters) =>
        string.Join("&", parameters.Select(kvp =>
            $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value ?? string.Empty)}"));

    private static T? Deserialize<T>(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return default;

        try
        {
            return JsonSerializer.Deserialize<T>(json);
        }
        catch
        {
            return default;
        }
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
            {
                return errorDescription.GetString();
            }

            if (root.TryGetProperty("error", out var error))
            {
                if (error.ValueKind == JsonValueKind.String)
                    return error.GetString();

                if (error.ValueKind == JsonValueKind.Object &&
                    error.TryGetProperty("message", out var errorMessage) &&
                    errorMessage.ValueKind == JsonValueKind.String)
                {
                    return errorMessage.GetString();
                }
            }
        }
        catch
        {
        }

        return null;
    }

    private async Task MarkClinicDisconnectedAsync(Guid clinicId)
    {
        var clinic = await LoadClinicWithLegacyAsync(clinicId);
        if (clinic == null)
            return;

        clinic.GmailConnected = false;
        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.Gmail);
    }

    private class GoogleOAuthStatePayload
    {
        public Guid ClinicId { get; set; }
        public Guid UserId { get; set; }
        public string? ReturnUrl { get; set; }
        public string? AllowedOrigin { get; set; }
    }

    private class TokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }

        [JsonPropertyName("expires_in")]
        public int? ExpiresIn { get; set; }
    }

    private class GoogleProfileResponse
    {
        [JsonPropertyName("emailAddress")]
        public string? EmailAddress { get; set; }
    }
}

public class GoogleOAuthException : Exception
{
    public int StatusCode { get; }

    public GoogleOAuthException(string message, int statusCode) : base(message)
    {
        StatusCode = statusCode;
    }
}
