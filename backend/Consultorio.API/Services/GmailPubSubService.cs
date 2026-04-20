using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Services;

public class GmailPubSubService
{
    private const string PubSubScope = "https://www.googleapis.com/auth/pubsub";
    private const string GmailPublisherMember = "serviceAccount:gmail-api-push@system.gserviceaccount.com";
    private const string GmailPublisherRole = "roles/pubsub.publisher";

    private readonly AppDbContext _db;
    private readonly GoogleOAuthService _googleOAuth;
    private readonly GmailInboxSyncService _gmailInboxSync;
    private readonly IConfiguration _config;
    private readonly HttpClient _http;
    private readonly ILogger<GmailPubSubService> _logger;
    private readonly LegacyIntegrationBridge _legacyBridge;

    public GmailPubSubService(
        AppDbContext db,
        GoogleOAuthService googleOAuth,
        GmailInboxSyncService gmailInboxSync,
        IConfiguration config,
        HttpClient http,
        ILogger<GmailPubSubService> logger,
        LegacyIntegrationBridge legacyBridge)
    {
        _db = db;
        _googleOAuth = googleOAuth;
        _gmailInboxSync = gmailInboxSync;
        _config = config;
        _http = http;
        _logger = logger;
        _legacyBridge = legacyBridge;
    }

    public async Task<GmailWatchActivationResult> EnsureWatchAsync(
        Guid clinicId,
        HttpRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var clinic = await LoadClinicAsync(clinicId, cancellationToken);
        ValidatePubSubConfiguration(clinic);

        var serviceAccount = ParseServiceAccount(clinic.PubsubServiceAccount!);
        var accessToken = await CreateServiceAccountAccessTokenAsync(serviceAccount, cancellationToken);

        clinic.PubsubVerificationToken ??= Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        clinic.GmailAddress ??= await _googleOAuth.GetProfileEmailAsync(clinicId);

        var pushEndpoint = BuildPushEndpoint(clinic, request);
        var topicPath = BuildTopicPath(clinic);
        var subscriptionName = clinic.PubsubSubscriptionName ?? BuildSubscriptionName(clinic.Id);

        await TryEnsureTopicPublisherAsync(clinic, accessToken, cancellationToken);
        await CreateOrUpdatePushSubscriptionAsync(clinic, accessToken, subscriptionName, topicPath, pushEndpoint, cancellationToken);

        var gmailAccessToken = await _googleOAuth.GetValidAccessTokenAsync(clinicId);
        var watchResponse = await StartGmailWatchAsync(gmailAccessToken, topicPath, cancellationToken);

        clinic.PubsubSubscriptionName = subscriptionName;
        clinic.PubsubPushEndpoint = pushEndpoint;
        clinic.GmailWatchHistoryId = watchResponse.HistoryId;
        clinic.PubsubWatchExpiresAt = DateTimeOffset.FromUnixTimeMilliseconds(watchResponse.ExpirationEpochMs).UtcDateTime;
        clinic.GmailConnected = true;
        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        await _legacyBridge.TrySyncClinicAsync(
            clinic,
            LegacyIntegrationGroup.Gmail | LegacyIntegrationGroup.PubSub,
            cancellationToken);

        return new GmailWatchActivationResult
        {
            HistoryId = watchResponse.HistoryId,
            ExpiresAt = clinic.PubsubWatchExpiresAt!.Value,
            SubscriptionName = subscriptionName,
        };
    }

    public async Task StopWatchAsync(
        Guid clinicId,
        bool deleteSubscription,
        CancellationToken cancellationToken = default)
    {
        var clinic = await LoadClinicAsync(clinicId, cancellationToken);

        if (clinic.GmailConnected &&
            (!string.IsNullOrWhiteSpace(clinic.GmailAccessToken) || !string.IsNullOrWhiteSpace(clinic.GmailRefreshToken)))
        {
            try
            {
                var gmailAccessToken = await _googleOAuth.GetValidAccessTokenAsync(clinicId);
                await StopGmailWatchRemoteAsync(gmailAccessToken, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Nao foi possivel encerrar o watch remoto do Gmail para a clinica {ClinicId}", clinicId);
            }
        }

        if (deleteSubscription &&
            !string.IsNullOrWhiteSpace(clinic.PubsubSubscriptionName) &&
            !string.IsNullOrWhiteSpace(clinic.PubsubProjectId) &&
            !string.IsNullOrWhiteSpace(clinic.PubsubServiceAccount))
        {
            try
            {
                var serviceAccount = ParseServiceAccount(clinic.PubsubServiceAccount);
                var accessToken = await CreateServiceAccountAccessTokenAsync(serviceAccount, cancellationToken);
                await DeletePushSubscriptionAsync(clinic, accessToken, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Nao foi possivel remover a subscription Pub/Sub da clinica {ClinicId}", clinicId);
            }
        }

        clinic.GmailWatchHistoryId = null;
        clinic.PubsubWatchExpiresAt = null;
        if (deleteSubscription)
        {
            clinic.PubsubSubscriptionName = null;
            clinic.PubsubPushEndpoint = null;
        }

        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.PubSub, cancellationToken);
    }

    public async Task<int> ProcessPushNotificationAsync(
        Guid clinicId,
        string? verificationToken,
        GmailPubSubPushEnvelope? envelope,
        CancellationToken cancellationToken = default)
    {
        if (clinicId == Guid.Empty || envelope?.Message?.Data == null)
            return 0;

        var clinic = await _db.Clinics.FindAsync([clinicId], cancellationToken);
        if (clinic == null)
            return 0;

        if (!FixedTimeEquals(clinic.PubsubVerificationToken, verificationToken))
        {
            _logger.LogWarning("Notificacao Pub/Sub ignorada para a clinica {ClinicId}: token invalido", clinicId);
            return 0;
        }

        GmailPushNotification notification;
        try
        {
            notification = DecodePushNotification(envelope.Message.Data);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao decodificar a notificacao Pub/Sub da clinica {ClinicId}", clinicId);
            return 0;
        }

        if (string.IsNullOrWhiteSpace(notification.EmailAddress) || string.IsNullOrWhiteSpace(notification.HistoryId))
            return 0;

        if (!string.IsNullOrWhiteSpace(clinic.GmailAddress) &&
            !string.Equals(clinic.GmailAddress, notification.EmailAddress, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "Notificacao Pub/Sub ignorada para a clinica {ClinicId}: mailbox {Mailbox} difere de {ConfiguredMailbox}",
                clinicId,
                notification.EmailAddress,
                clinic.GmailAddress);
            return 0;
        }

        clinic.GmailAddress ??= notification.EmailAddress;
        clinic.GmailWatchHistoryId = notification.HistoryId;
        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        await _legacyBridge.TrySyncClinicAsync(clinic, LegacyIntegrationGroup.PubSub, cancellationToken);

        var imported = await _gmailInboxSync.SyncRecentInboxAsync(clinicId, maxResults: 25);
        _logger.LogInformation(
            "Notificacao Pub/Sub processada para a clinica {ClinicId}. {Imported} mensagem(ns) importada(s).",
            clinicId,
            imported);

        return imported;
    }

    public async Task RenewExpiringWatchesAsync(CancellationToken cancellationToken = default)
    {
        var renewalCutoff = DateTime.UtcNow.AddDays(1);
        var clinicIds = await _db.Clinics
            .Where(c =>
                c.IsActive &&
                c.GmailConnected &&
                c.PubsubProjectId != null &&
                c.PubsubTopicName != null &&
                c.PubsubServiceAccount != null &&
                c.PubsubPushEndpoint != null &&
                (!c.PubsubWatchExpiresAt.HasValue || c.PubsubWatchExpiresAt.Value <= renewalCutoff))
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        foreach (var clinicId in clinicIds)
        {
            try
            {
                await EnsureWatchAsync(clinicId, null, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao renovar o watch Pub/Sub da clinica {ClinicId}", clinicId);
            }
        }
    }

    private async Task<Clinic> LoadClinicAsync(Guid clinicId, CancellationToken cancellationToken)
    {
        if (clinicId == Guid.Empty)
            throw new GmailPubSubException("Clinica invalida para configurar o Gmail Pub/Sub", StatusCodes.Status400BadRequest);

        var clinic = await _db.Clinics.FindAsync([clinicId], cancellationToken);
        if (clinic == null)
            throw new GmailPubSubException("Clinica nao encontrada", StatusCodes.Status404NotFound);

        if (await _legacyBridge.TryBackfillClinicAsync(
                clinic,
                LegacyIntegrationGroup.Gmail | LegacyIntegrationGroup.PubSub,
                cancellationToken))
        {
            clinic.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return clinic;
    }

    private static void ValidatePubSubConfiguration(Clinic clinic)
    {
        if (!clinic.GmailConnected)
            throw new GmailPubSubException("Conecte o Gmail via OAuth antes de ativar o Pub/Sub", StatusCodes.Status422UnprocessableEntity);

        if (string.IsNullOrWhiteSpace(clinic.PubsubProjectId) ||
            string.IsNullOrWhiteSpace(clinic.PubsubTopicName) ||
            string.IsNullOrWhiteSpace(clinic.PubsubServiceAccount))
        {
            throw new GmailPubSubException("Salve Project ID, Topic Name e Service Account do Pub/Sub antes de ativar o watch", StatusCodes.Status422UnprocessableEntity);
        }
    }

    private static string BuildTopicPath(Clinic clinic) =>
        $"projects/{clinic.PubsubProjectId}/topics/{clinic.PubsubTopicName}";

    private static string BuildSubscriptionName(Guid clinicId) =>
        $"consultorio-gmail-{clinicId:N}".ToLowerInvariant();

    private string BuildPushEndpoint(Clinic clinic, HttpRequest? request)
    {
        var baseUrl = ResolvePublicApiBaseUrl(clinic, request);
        var token = clinic.PubsubVerificationToken
            ?? throw new GmailPubSubException("Token de verificacao do webhook nao encontrado", StatusCodes.Status500InternalServerError);

        return $"{baseUrl}/api/webhooks/gmail?clinicId={clinic.Id}&token={Uri.EscapeDataString(token)}";
    }

    private string ResolvePublicApiBaseUrl(Clinic clinic, HttpRequest? request)
    {
        var configuredBaseUrl = NormalizePublicApiBaseUrl(
            _config["PublicApiUrl"] ??
            _config["PUBLIC_API_URL"] ??
            _config["App:PublicApiUrl"]);

        if (!string.IsNullOrWhiteSpace(configuredBaseUrl))
            return configuredBaseUrl;

        if (request != null)
            return ResolveRequestBaseUrl(request);

        if (Uri.TryCreate(clinic.PubsubPushEndpoint, UriKind.Absolute, out var existingEndpoint))
            return $"{existingEndpoint.Scheme}://{existingEndpoint.Authority}";

        throw new GmailPubSubException(
            "Nao foi possivel determinar a URL publica da API para o webhook do Gmail. Configure PublicApiUrl no backend ou reative o watch pelo painel.",
            StatusCodes.Status500InternalServerError);
    }

    private static string? NormalizePublicApiBaseUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = value.Trim().TrimEnd('/');
        if (normalized.EndsWith("/api", StringComparison.OrdinalIgnoreCase))
            normalized = normalized[..^4];

        return normalized.TrimEnd('/');
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
            throw new GmailPubSubException("Nao foi possivel determinar a URL publica da API", StatusCodes.Status500InternalServerError);

        return $"{protocol}://{host}";
    }

    private PubSubServiceAccount ParseServiceAccount(string rawJson)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<PubSubServiceAccount>(rawJson);
            if (parsed == null ||
                !string.Equals(parsed.Type, "service_account", StringComparison.OrdinalIgnoreCase) ||
                string.IsNullOrWhiteSpace(parsed.ClientEmail) ||
                string.IsNullOrWhiteSpace(parsed.PrivateKey) ||
                string.IsNullOrWhiteSpace(parsed.ProjectId))
            {
                throw new GmailPubSubException("A Service Account do Pub/Sub esta incompleta ou invalida", StatusCodes.Status422UnprocessableEntity);
            }

            return parsed;
        }
        catch (JsonException ex)
        {
            throw new GmailPubSubException("O JSON da Service Account do Pub/Sub e invalido", StatusCodes.Status422UnprocessableEntity, ex);
        }
    }

    private async Task<string> CreateServiceAccountAccessTokenAsync(
        PubSubServiceAccount serviceAccount,
        CancellationToken cancellationToken)
    {
        using var rsa = RSA.Create();
        rsa.ImportFromPem(serviceAccount.PrivateKey);

        var securityKey = new RsaSecurityKey(rsa);
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.RsaSha256);
        var now = DateTime.UtcNow;

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = serviceAccount.ClientEmail,
            Audience = "https://oauth2.googleapis.com/token",
            Subject = new ClaimsIdentity([new Claim("scope", PubSubScope)]),
            NotBefore = now,
            IssuedAt = now,
            Expires = now.AddMinutes(55),
            SigningCredentials = credentials,
        };

        var handler = new JwtSecurityTokenHandler();
        var assertion = handler.CreateEncodedJwt(descriptor);

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = assertion,
            }),
        };

        using var response = await _http.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        var token = Deserialize<ServiceAccountTokenResponse>(payload);

        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(token?.AccessToken))
        {
            throw new GmailPubSubException(
                ExtractApiError(payload) ?? "Falha ao autenticar a Service Account do Pub/Sub",
                StatusCodes.Status400BadRequest);
        }

        return token.AccessToken;
    }

    private async Task TryEnsureTopicPublisherAsync(
        Clinic clinic,
        string pubSubAccessToken,
        CancellationToken cancellationToken)
    {
        try
        {
            var topicPath = BuildTopicPath(clinic);
            var policy = await GetTopicPolicyAsync(topicPath, pubSubAccessToken, cancellationToken);
            if (policy == null)
                return;

            var bindings = policy.Bindings ?? [];
            var binding = bindings.FirstOrDefault(b => string.Equals(b.Role, GmailPublisherRole, StringComparison.OrdinalIgnoreCase));
            if (binding?.Members?.Contains(GmailPublisherMember, StringComparer.OrdinalIgnoreCase) == true)
                return;

            if (binding == null)
            {
                binding = new PubSubIamBinding
                {
                    Role = GmailPublisherRole,
                    Members = [GmailPublisherMember],
                };
                bindings.Add(binding);
            }
            else
            {
                binding.Members ??= [];
                if (!binding.Members.Contains(GmailPublisherMember, StringComparer.OrdinalIgnoreCase))
                    binding.Members.Add(GmailPublisherMember);
            }

            policy.Bindings = bindings;
            await SetTopicPolicyAsync(topicPath, policy, pubSubAccessToken, cancellationToken);
        }
        catch (GmailPubSubException ex) when (ex.StatusCode is StatusCodes.Status401Unauthorized or StatusCodes.Status403Forbidden)
        {
            _logger.LogInformation(
                "Nao foi possivel ajustar automaticamente o publisher do topico Pub/Sub para a clinica {ClinicId}. A permissao pode precisar ser configurada manualmente.",
                clinic.Id);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao tentar ajustar o publisher do topico Pub/Sub da clinica {ClinicId}", clinic.Id);
        }
    }

    private async Task<PubSubIamPolicy?> GetTopicPolicyAsync(
        string topicPath,
        string pubSubAccessToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://pubsub.googleapis.com/v1/{topicPath}:getIamPolicy")
        {
            Content = JsonContent(new { }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", pubSubAccessToken);

        using var response = await _http.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
            throw new GmailPubSubException("Topico Pub/Sub nao encontrado. Confirme o Project ID e o Topic Name informados.", StatusCodes.Status422UnprocessableEntity);

        if (!response.IsSuccessStatusCode)
        {
            throw new GmailPubSubException(
                ExtractApiError(payload) ?? "Falha ao consultar as permissoes do topico Pub/Sub",
                (int)response.StatusCode);
        }

        return Deserialize<PubSubIamPolicy>(payload);
    }

    private async Task SetTopicPolicyAsync(
        string topicPath,
        PubSubIamPolicy policy,
        string pubSubAccessToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://pubsub.googleapis.com/v1/{topicPath}:setIamPolicy")
        {
            Content = JsonContent(new { policy }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", pubSubAccessToken);

        using var response = await _http.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new GmailPubSubException(
                ExtractApiError(payload) ?? "Falha ao atualizar as permissoes do topico Pub/Sub",
                (int)response.StatusCode);
        }
    }

    private async Task CreateOrUpdatePushSubscriptionAsync(
        Clinic clinic,
        string pubSubAccessToken,
        string subscriptionName,
        string topicPath,
        string pushEndpoint,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Put,
            $"https://pubsub.googleapis.com/v1/projects/{clinic.PubsubProjectId}/subscriptions/{subscriptionName}")
        {
            Content = JsonContent(new
            {
                topic = topicPath,
                pushConfig = new
                {
                    pushEndpoint,
                    attributes = new Dictionary<string, string>
                    {
                        ["x-goog-version"] = "v1",
                    },
                },
                ackDeadlineSeconds = 10,
            }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", pubSubAccessToken);

        using var response = await _http.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new GmailPubSubException(
                ExtractApiError(payload) ?? "Falha ao criar ou atualizar a subscription push do Pub/Sub",
                (int)response.StatusCode);
        }
    }

    private async Task DeletePushSubscriptionAsync(
        Clinic clinic,
        string pubSubAccessToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Delete,
            $"https://pubsub.googleapis.com/v1/projects/{clinic.PubsubProjectId}/subscriptions/{clinic.PubsubSubscriptionName}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", pubSubAccessToken);

        using var response = await _http.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
            return;

        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new GmailPubSubException(
                ExtractApiError(payload) ?? "Falha ao remover a subscription push do Pub/Sub",
                (int)response.StatusCode);
        }
    }

    private async Task<GmailWatchResponse> StartGmailWatchAsync(
        string gmailAccessToken,
        string topicPath,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://gmail.googleapis.com/gmail/v1/users/me/watch")
        {
            Content = JsonContent(new
            {
                topicName = topicPath,
                labelIds = new[] { "INBOX" },
                labelFilterBehavior = "INCLUDE",
            }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", gmailAccessToken);

        using var response = await _http.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        var watch = Deserialize<GmailWatchResponse>(payload);

        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(watch?.HistoryId) || watch.ExpirationEpochMs <= 0)
        {
            var message = ExtractApiError(payload) ?? "Falha ao ativar o watch do Gmail";
            if (message.Contains("publish", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("topic", StringComparison.OrdinalIgnoreCase))
            {
                message += " Confirme tambem se o topico recebeu o publisher roles/pubsub.publisher para gmail-api-push@system.gserviceaccount.com.";
            }

            throw new GmailPubSubException(message, StatusCodes.Status400BadRequest);
        }

        return watch;
    }

    private async Task StopGmailWatchRemoteAsync(string gmailAccessToken, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://gmail.googleapis.com/gmail/v1/users/me/stop")
        {
            Content = JsonContent(new { }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", gmailAccessToken);

        using var response = await _http.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new GmailPubSubException(
                ExtractApiError(payload) ?? "Falha ao desativar o watch do Gmail",
                (int)response.StatusCode);
        }
    }

    private static GmailPushNotification DecodePushNotification(string base64Data)
    {
        var json = DecodeBase64Url(base64Data);
        return JsonSerializer.Deserialize<GmailPushNotification>(json)
            ?? throw new InvalidOperationException("Payload Pub/Sub invalido");
    }

    private static StringContent JsonContent<T>(T value) =>
        new(JsonSerializer.Serialize(value), Encoding.UTF8, "application/json");

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

    private static string? ExtractApiError(string? json)
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

                if (error.ValueKind == JsonValueKind.Object &&
                    error.TryGetProperty("status", out var errorStatus) &&
                    errorStatus.ValueKind == JsonValueKind.String)
                {
                    return errorStatus.GetString();
                }
            }
        }
        catch
        {
        }

        return null;
    }

    private static string DecodeBase64Url(string value)
    {
        var normalized = value.Replace('-', '+').Replace('_', '/');
        var padding = 4 - (normalized.Length % 4);
        if (padding is > 0 and < 4)
            normalized = normalized.PadRight(normalized.Length + padding, '=');

        var bytes = Convert.FromBase64String(normalized);
        return Encoding.UTF8.GetString(bytes);
    }

    private static bool FixedTimeEquals(string? expected, string? provided)
    {
        if (string.IsNullOrWhiteSpace(expected) || string.IsNullOrWhiteSpace(provided))
            return false;

        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var providedBytes = Encoding.UTF8.GetBytes(provided);
        if (expectedBytes.Length != providedBytes.Length)
            return false;

        return CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes);
    }

    private sealed class ServiceAccountTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }
    }

    private sealed class PubSubServiceAccount
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("project_id")]
        public string? ProjectId { get; set; }

        [JsonPropertyName("private_key")]
        public string? PrivateKey { get; set; }

        [JsonPropertyName("client_email")]
        public string? ClientEmail { get; set; }
    }

    private sealed class PubSubIamPolicy
    {
        [JsonPropertyName("bindings")]
        public List<PubSubIamBinding>? Bindings { get; set; }

        [JsonPropertyName("etag")]
        public string? Etag { get; set; }

        [JsonPropertyName("version")]
        public int? Version { get; set; }
    }

    private sealed class PubSubIamBinding
    {
        [JsonPropertyName("role")]
        public string? Role { get; set; }

        [JsonPropertyName("members")]
        public List<string>? Members { get; set; }
    }

    private sealed class GmailWatchResponse
    {
        [JsonPropertyName("historyId")]
        public string HistoryId { get; set; } = string.Empty;

        [JsonPropertyName("expiration")]
        [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
        public long ExpirationEpochMs { get; set; }
    }
}

public sealed class GmailWatchActivationResult
{
    public string HistoryId { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string SubscriptionName { get; set; } = string.Empty;
}

public sealed class GmailPubSubPushEnvelope
{
    [JsonPropertyName("message")]
    public GmailPubSubPushMessage? Message { get; set; }
}

public sealed class GmailPubSubPushMessage
{
    [JsonPropertyName("data")]
    public string? Data { get; set; }
}

public sealed class GmailPushNotification
{
    [JsonPropertyName("emailAddress")]
    public string? EmailAddress { get; set; }

    [JsonPropertyName("historyId")]
    public string? HistoryId { get; set; }
}

public class GmailPubSubException : Exception
{
    public int StatusCode { get; }

    public GmailPubSubException(string message, int statusCode) : base(message)
    {
        StatusCode = statusCode;
    }

    public GmailPubSubException(string message, int statusCode, Exception innerException)
        : base(message, innerException)
    {
        StatusCode = statusCode;
    }
}
