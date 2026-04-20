using System.Data;
using Consultorio.Domain.Models;
using Npgsql;

namespace Consultorio.API.Services;

[Flags]
public enum LegacyIntegrationGroup
{
    None = 0,
    Gmail = 1 << 0,
    PubSub = 1 << 1,
    WhatsApp = 1 << 2,
    Instagram = 1 << 3,
    MercadoPago = 1 << 4,
    All = Gmail | PubSub | WhatsApp | Instagram | MercadoPago,
}

public sealed class LegacyIntegrationBridge
{
    private readonly string? _connectionString;
    private readonly ILogger<LegacyIntegrationBridge> _logger;

    public LegacyIntegrationBridge(IConfiguration configuration, ILogger<LegacyIntegrationBridge> logger)
    {
        _logger = logger;
        _connectionString =
            configuration["LegacyIntegrations:ConnectionString"] ??
            configuration.GetConnectionString("LegacyIntegrations") ??
            Environment.GetEnvironmentVariable("DATABASE_URL");
    }

    public bool Enabled => !string.IsNullOrWhiteSpace(_connectionString);

    public async Task<bool> TryBackfillClinicAsync(
        Clinic clinic,
        LegacyIntegrationGroup groups = LegacyIntegrationGroup.All,
        CancellationToken cancellationToken = default)
    {
        if (!Enabled || groups == LegacyIntegrationGroup.None)
            return false;

        try
        {
            var legacy = await LoadLegacySettingsAsync(clinic.Id, cancellationToken);
            if (legacy == null)
                return false;

            return ApplyLegacyToClinic(clinic, legacy, groups);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Nao foi possivel carregar as integracoes legadas da clinica {ClinicId}", clinic.Id);
            return false;
        }
    }

    public async Task<bool> TrySyncClinicAsync(
        Clinic clinic,
        LegacyIntegrationGroup groups,
        CancellationToken cancellationToken = default)
    {
        if (!Enabled || groups == LegacyIntegrationGroup.None)
            return false;

        try
        {
            var existing = await LoadLegacySettingsAsync(clinic.Id, cancellationToken);
            var record = BuildLegacyRecord(clinic, existing, groups);

            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO "IntegrationSettings" (
                    "id",
                    "clinicId",
                    "gmailClientId",
                    "gmailClientSecret",
                    "gmailAccessToken",
                    "gmailRefreshToken",
                    "gmailTokenExpiresAt",
                    "gmailConnected",
                    "pubsubProjectId",
                    "pubsubTopicName",
                    "pubsubServiceAccount",
                    "pubsubWatchExpiresAt",
                    "waPhoneNumberId",
                    "waWabaId",
                    "waAccessToken",
                    "waVerifyToken",
                    "waAppSecret",
                    "waConnected",
                    "igAccountId",
                    "igPageId",
                    "igAccessToken",
                    "igTokenExpiresAt",
                    "igConnected",
                    "mpAccessTokenProd",
                    "mpAccessTokenSandbox",
                    "mpPublicKeyProd",
                    "mpWebhookSecret",
                    "mpConnected",
                    "updatedAt",
                    "gmailHistoryId",
                    "mpSandboxMode"
                )
                VALUES (
                    @id,
                    @clinicId,
                    @gmailClientId,
                    @gmailClientSecret,
                    @gmailAccessToken,
                    @gmailRefreshToken,
                    @gmailTokenExpiresAt,
                    @gmailConnected,
                    @pubsubProjectId,
                    @pubsubTopicName,
                    @pubsubServiceAccount,
                    @pubsubWatchExpiresAt,
                    @waPhoneNumberId,
                    @waWabaId,
                    @waAccessToken,
                    @waVerifyToken,
                    @waAppSecret,
                    @waConnected,
                    @igAccountId,
                    @igPageId,
                    @igAccessToken,
                    @igTokenExpiresAt,
                    @igConnected,
                    @mpAccessTokenProd,
                    @mpAccessTokenSandbox,
                    @mpPublicKeyProd,
                    @mpWebhookSecret,
                    @mpConnected,
                    @updatedAt,
                    @gmailHistoryId,
                    @mpSandboxMode
                )
                ON CONFLICT ("clinicId") DO UPDATE SET
                    "gmailClientId" = EXCLUDED."gmailClientId",
                    "gmailClientSecret" = EXCLUDED."gmailClientSecret",
                    "gmailAccessToken" = EXCLUDED."gmailAccessToken",
                    "gmailRefreshToken" = EXCLUDED."gmailRefreshToken",
                    "gmailTokenExpiresAt" = EXCLUDED."gmailTokenExpiresAt",
                    "gmailConnected" = EXCLUDED."gmailConnected",
                    "pubsubProjectId" = EXCLUDED."pubsubProjectId",
                    "pubsubTopicName" = EXCLUDED."pubsubTopicName",
                    "pubsubServiceAccount" = EXCLUDED."pubsubServiceAccount",
                    "pubsubWatchExpiresAt" = EXCLUDED."pubsubWatchExpiresAt",
                    "waPhoneNumberId" = EXCLUDED."waPhoneNumberId",
                    "waWabaId" = EXCLUDED."waWabaId",
                    "waAccessToken" = EXCLUDED."waAccessToken",
                    "waVerifyToken" = EXCLUDED."waVerifyToken",
                    "waAppSecret" = EXCLUDED."waAppSecret",
                    "waConnected" = EXCLUDED."waConnected",
                    "igAccountId" = EXCLUDED."igAccountId",
                    "igPageId" = EXCLUDED."igPageId",
                    "igAccessToken" = EXCLUDED."igAccessToken",
                    "igTokenExpiresAt" = EXCLUDED."igTokenExpiresAt",
                    "igConnected" = EXCLUDED."igConnected",
                    "mpAccessTokenProd" = EXCLUDED."mpAccessTokenProd",
                    "mpAccessTokenSandbox" = EXCLUDED."mpAccessTokenSandbox",
                    "mpPublicKeyProd" = EXCLUDED."mpPublicKeyProd",
                    "mpWebhookSecret" = EXCLUDED."mpWebhookSecret",
                    "mpConnected" = EXCLUDED."mpConnected",
                    "updatedAt" = EXCLUDED."updatedAt",
                    "gmailHistoryId" = EXCLUDED."gmailHistoryId",
                    "mpSandboxMode" = EXCLUDED."mpSandboxMode";
                """;

            AddParameter(command, "id", record.Id);
            AddParameter(command, "clinicId", record.ClinicId);
            AddParameter(command, "gmailClientId", record.GmailClientId);
            AddParameter(command, "gmailClientSecret", record.GmailClientSecret);
            AddParameter(command, "gmailAccessToken", record.GmailAccessToken);
            AddParameter(command, "gmailRefreshToken", record.GmailRefreshToken);
            AddParameter(command, "gmailTokenExpiresAt", record.GmailTokenExpiresAt);
            AddParameter(command, "gmailConnected", record.GmailConnected);
            AddParameter(command, "pubsubProjectId", record.PubsubProjectId);
            AddParameter(command, "pubsubTopicName", record.PubsubTopicName);
            AddParameter(command, "pubsubServiceAccount", record.PubsubServiceAccount);
            AddParameter(command, "pubsubWatchExpiresAt", record.PubsubWatchExpiresAt);
            AddParameter(command, "waPhoneNumberId", record.WaPhoneNumberId);
            AddParameter(command, "waWabaId", record.WaWabaId);
            AddParameter(command, "waAccessToken", record.WaAccessToken);
            AddParameter(command, "waVerifyToken", record.WaVerifyToken);
            AddParameter(command, "waAppSecret", record.WaAppSecret);
            AddParameter(command, "waConnected", record.WaConnected);
            AddParameter(command, "igAccountId", record.IgAccountId);
            AddParameter(command, "igPageId", record.IgPageId);
            AddParameter(command, "igAccessToken", record.IgAccessToken);
            AddParameter(command, "igTokenExpiresAt", record.IgTokenExpiresAt);
            AddParameter(command, "igConnected", record.IgConnected);
            AddParameter(command, "mpAccessTokenProd", record.MpAccessTokenProd);
            AddParameter(command, "mpAccessTokenSandbox", record.MpAccessTokenSandbox);
            AddParameter(command, "mpPublicKeyProd", record.MpPublicKeyProd);
            AddParameter(command, "mpWebhookSecret", record.MpWebhookSecret);
            AddParameter(command, "mpConnected", record.MpConnected);
            AddParameter(command, "updatedAt", record.UpdatedAt);
            AddParameter(command, "gmailHistoryId", record.GmailHistoryId);
            AddParameter(command, "mpSandboxMode", record.MpSandboxMode);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Nao foi possivel espelhar as integracoes da clinica {ClinicId} para o legado", clinic.Id);
            return false;
        }
    }

    private async Task<LegacyIntegrationRecord?> LoadLegacySettingsAsync(Guid clinicId, CancellationToken cancellationToken)
    {
        if (!Enabled)
            return null;

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                "id",
                "clinicId",
                "gmailClientId",
                "gmailClientSecret",
                "gmailAccessToken",
                "gmailRefreshToken",
                "gmailTokenExpiresAt",
                "gmailConnected",
                "pubsubProjectId",
                "pubsubTopicName",
                "pubsubServiceAccount",
                "pubsubWatchExpiresAt",
                "waPhoneNumberId",
                "waWabaId",
                "waAccessToken",
                "waVerifyToken",
                "waAppSecret",
                "waConnected",
                "igAccountId",
                "igPageId",
                "igAccessToken",
                "igTokenExpiresAt",
                "igConnected",
                "mpAccessTokenProd",
                "mpAccessTokenSandbox",
                "mpPublicKeyProd",
                "mpWebhookSecret",
                "mpConnected",
                "updatedAt",
                "gmailHistoryId",
                "mpSandboxMode"
            FROM "IntegrationSettings"
            WHERE "clinicId" = @clinicId
            LIMIT 1;
            """;
        AddParameter(command, "clinicId", clinicId.ToString());

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return new LegacyIntegrationRecord
        {
            Id = GetString(reader, "id") ?? Guid.NewGuid().ToString(),
            ClinicId = GetString(reader, "clinicId") ?? clinicId.ToString(),
            GmailClientId = GetString(reader, "gmailClientId"),
            GmailClientSecret = GetString(reader, "gmailClientSecret"),
            GmailAccessToken = GetString(reader, "gmailAccessToken"),
            GmailRefreshToken = GetString(reader, "gmailRefreshToken"),
            GmailTokenExpiresAt = GetDateTime(reader, "gmailTokenExpiresAt"),
            GmailConnected = GetBoolean(reader, "gmailConnected"),
            PubsubProjectId = GetString(reader, "pubsubProjectId"),
            PubsubTopicName = GetString(reader, "pubsubTopicName"),
            PubsubServiceAccount = GetString(reader, "pubsubServiceAccount"),
            PubsubWatchExpiresAt = GetDateTime(reader, "pubsubWatchExpiresAt"),
            WaPhoneNumberId = GetString(reader, "waPhoneNumberId"),
            WaWabaId = GetString(reader, "waWabaId"),
            WaAccessToken = GetString(reader, "waAccessToken"),
            WaVerifyToken = GetString(reader, "waVerifyToken"),
            WaAppSecret = GetString(reader, "waAppSecret"),
            WaConnected = GetBoolean(reader, "waConnected"),
            IgAccountId = GetString(reader, "igAccountId"),
            IgPageId = GetString(reader, "igPageId"),
            IgAccessToken = GetString(reader, "igAccessToken"),
            IgTokenExpiresAt = GetDateTime(reader, "igTokenExpiresAt"),
            IgConnected = GetBoolean(reader, "igConnected"),
            MpAccessTokenProd = GetString(reader, "mpAccessTokenProd"),
            MpAccessTokenSandbox = GetString(reader, "mpAccessTokenSandbox"),
            MpPublicKeyProd = GetString(reader, "mpPublicKeyProd"),
            MpWebhookSecret = GetString(reader, "mpWebhookSecret"),
            MpConnected = GetBoolean(reader, "mpConnected"),
            UpdatedAt = GetDateTime(reader, "updatedAt") ?? DateTime.UtcNow,
            GmailHistoryId = GetString(reader, "gmailHistoryId"),
            MpSandboxMode = GetBoolean(reader, "mpSandboxMode"),
        };
    }

    private static bool ApplyLegacyToClinic(Clinic clinic, LegacyIntegrationRecord legacy, LegacyIntegrationGroup groups)
    {
        var changed = false;

        if (groups.HasFlag(LegacyIntegrationGroup.Gmail))
        {
            changed |= SetIfMissing(ref clinic.GmailClientId, legacy.GmailClientId);
            changed |= SetIfMissing(ref clinic.GmailClientSecret, legacy.GmailClientSecret);
            changed |= SetIfMissing(ref clinic.GmailAccessToken, legacy.GmailAccessToken);
            changed |= SetIfMissing(ref clinic.GmailRefreshToken, legacy.GmailRefreshToken);
            changed |= SetIfMissing(ref clinic.GmailTokenExpiresAt, legacy.GmailTokenExpiresAt);

            if (!clinic.GmailConnected &&
                string.IsNullOrWhiteSpace(clinic.GmailAccessToken) &&
                string.IsNullOrWhiteSpace(clinic.GmailRefreshToken) &&
                legacy.GmailConnected)
            {
                clinic.GmailConnected = true;
                changed = true;
            }
        }

        if (groups.HasFlag(LegacyIntegrationGroup.PubSub))
        {
            changed |= SetIfMissing(ref clinic.PubsubProjectId, legacy.PubsubProjectId);
            changed |= SetIfMissing(ref clinic.PubsubTopicName, legacy.PubsubTopicName);
            changed |= SetIfMissing(ref clinic.PubsubServiceAccount, legacy.PubsubServiceAccount);
            changed |= SetIfMissing(ref clinic.PubsubWatchExpiresAt, legacy.PubsubWatchExpiresAt);
            changed |= SetIfMissing(ref clinic.GmailWatchHistoryId, legacy.GmailHistoryId);
        }

        if (groups.HasFlag(LegacyIntegrationGroup.WhatsApp))
        {
            changed |= SetIfMissing(ref clinic.WaPhoneNumberId, legacy.WaPhoneNumberId);
            changed |= SetIfMissing(ref clinic.WaWabaId, legacy.WaWabaId);
            changed |= SetIfMissing(ref clinic.WaAccessToken, legacy.WaAccessToken);
            changed |= SetIfMissing(ref clinic.WaVerifyToken, legacy.WaVerifyToken);
            changed |= SetIfMissing(ref clinic.WaAppSecret, legacy.WaAppSecret);

            if (!clinic.WaConnected &&
                string.IsNullOrWhiteSpace(clinic.WaAccessToken) &&
                string.IsNullOrWhiteSpace(clinic.WaPhoneNumberId) &&
                legacy.WaConnected)
            {
                clinic.WaConnected = true;
                changed = true;
            }
        }

        if (groups.HasFlag(LegacyIntegrationGroup.Instagram))
        {
            changed |= SetIfMissing(ref clinic.IgAccountId, legacy.IgAccountId);
            changed |= SetIfMissing(ref clinic.IgPageId, legacy.IgPageId);
            changed |= SetIfMissing(ref clinic.IgAccessToken, legacy.IgAccessToken);
            changed |= SetIfMissing(ref clinic.IgTokenExpiresAt, legacy.IgTokenExpiresAt);

            if (!clinic.IgConnected &&
                string.IsNullOrWhiteSpace(clinic.IgAccessToken) &&
                string.IsNullOrWhiteSpace(clinic.IgPageId) &&
                legacy.IgConnected)
            {
                clinic.IgConnected = true;
                changed = true;
            }
        }

        if (groups.HasFlag(LegacyIntegrationGroup.MercadoPago))
        {
            changed |= SetIfMissing(ref clinic.MpAccessTokenProd, legacy.MpAccessTokenProd);
            changed |= SetIfMissing(ref clinic.MpAccessTokenSandbox, legacy.MpAccessTokenSandbox);
            changed |= SetIfMissing(ref clinic.MpPublicKey, legacy.MpPublicKeyProd);
            changed |= SetIfMissing(ref clinic.MpWebhookSecret, legacy.MpWebhookSecret);

            if (string.IsNullOrWhiteSpace(clinic.MpAccessTokenProd) &&
                string.IsNullOrWhiteSpace(clinic.MpAccessTokenSandbox) &&
                string.IsNullOrWhiteSpace(clinic.MpPublicKey))
            {
                if (clinic.MpSandboxMode != legacy.MpSandboxMode)
                {
                    clinic.MpSandboxMode = legacy.MpSandboxMode;
                    changed = true;
                }

                if (!clinic.MpConnected && legacy.MpConnected)
                {
                    clinic.MpConnected = true;
                    changed = true;
                }
            }
        }

        return changed;
    }

    private static LegacyIntegrationRecord BuildLegacyRecord(
        Clinic clinic,
        LegacyIntegrationRecord? existing,
        LegacyIntegrationGroup groups)
    {
        var record = existing ?? new LegacyIntegrationRecord
        {
            Id = Guid.NewGuid().ToString(),
            ClinicId = clinic.Id.ToString(),
            UpdatedAt = DateTime.UtcNow,
        };

        if (groups.HasFlag(LegacyIntegrationGroup.Gmail))
        {
            record.GmailClientId = clinic.GmailClientId;
            record.GmailClientSecret = clinic.GmailClientSecret;
            record.GmailAccessToken = clinic.GmailAccessToken;
            record.GmailRefreshToken = clinic.GmailRefreshToken;
            record.GmailTokenExpiresAt = clinic.GmailTokenExpiresAt;
            record.GmailConnected = clinic.GmailConnected;
        }

        if (groups.HasFlag(LegacyIntegrationGroup.PubSub))
        {
            record.PubsubProjectId = clinic.PubsubProjectId;
            record.PubsubTopicName = clinic.PubsubTopicName;
            record.PubsubServiceAccount = clinic.PubsubServiceAccount;
            record.PubsubWatchExpiresAt = clinic.PubsubWatchExpiresAt;
            record.GmailHistoryId = clinic.GmailWatchHistoryId;
        }

        if (groups.HasFlag(LegacyIntegrationGroup.WhatsApp))
        {
            record.WaPhoneNumberId = clinic.WaPhoneNumberId;
            record.WaWabaId = clinic.WaWabaId;
            record.WaAccessToken = clinic.WaAccessToken;
            record.WaVerifyToken = clinic.WaVerifyToken;
            record.WaAppSecret = clinic.WaAppSecret;
            record.WaConnected = clinic.WaConnected;
        }

        if (groups.HasFlag(LegacyIntegrationGroup.Instagram))
        {
            record.IgAccountId = clinic.IgAccountId;
            record.IgPageId = clinic.IgPageId;
            record.IgAccessToken = clinic.IgAccessToken;
            record.IgTokenExpiresAt = clinic.IgTokenExpiresAt;
            record.IgConnected = clinic.IgConnected;
        }

        if (groups.HasFlag(LegacyIntegrationGroup.MercadoPago))
        {
            record.MpAccessTokenProd = clinic.MpAccessTokenProd;
            record.MpAccessTokenSandbox = clinic.MpAccessTokenSandbox;
            record.MpPublicKeyProd = clinic.MpPublicKey;
            record.MpWebhookSecret = clinic.MpWebhookSecret;
            record.MpConnected = clinic.MpConnected;
            record.MpSandboxMode = clinic.MpSandboxMode;
        }

        record.UpdatedAt = clinic.UpdatedAt ?? DateTime.UtcNow;
        return record;
    }

    private static bool SetIfMissing(ref string? currentValue, string? legacyValue)
    {
        if (!string.IsNullOrWhiteSpace(currentValue) || string.IsNullOrWhiteSpace(legacyValue))
            return false;

        currentValue = legacyValue;
        return true;
    }

    private static bool SetIfMissing(ref DateTime? currentValue, DateTime? legacyValue)
    {
        if (currentValue.HasValue || !legacyValue.HasValue)
            return false;

        currentValue = legacyValue;
        return true;
    }

    private static void AddParameter(NpgsqlCommand command, string name, string? value)
    {
        command.Parameters.AddWithValue(name, (object?)value ?? DBNull.Value);
    }

    private static void AddParameter(NpgsqlCommand command, string name, DateTime? value)
    {
        command.Parameters.AddWithValue(name, value.HasValue ? value.Value : DBNull.Value);
    }

    private static void AddParameter(NpgsqlCommand command, string name, bool value)
    {
        command.Parameters.AddWithValue(name, value);
    }

    private static string? GetString(IDataRecord record, string column)
    {
        var ordinal = record.GetOrdinal(column);
        return record.IsDBNull(ordinal) ? null : record.GetString(ordinal);
    }

    private static DateTime? GetDateTime(IDataRecord record, string column)
    {
        var ordinal = record.GetOrdinal(column);
        return record.IsDBNull(ordinal) ? null : record.GetDateTime(ordinal);
    }

    private static bool GetBoolean(IDataRecord record, string column)
    {
        var ordinal = record.GetOrdinal(column);
        return !record.IsDBNull(ordinal) && record.GetBoolean(ordinal);
    }

    private sealed class LegacyIntegrationRecord
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string ClinicId { get; set; } = string.Empty;
        public string? GmailClientId { get; set; }
        public string? GmailClientSecret { get; set; }
        public string? GmailAccessToken { get; set; }
        public string? GmailRefreshToken { get; set; }
        public DateTime? GmailTokenExpiresAt { get; set; }
        public bool GmailConnected { get; set; }
        public string? PubsubProjectId { get; set; }
        public string? PubsubTopicName { get; set; }
        public string? PubsubServiceAccount { get; set; }
        public DateTime? PubsubWatchExpiresAt { get; set; }
        public string? WaPhoneNumberId { get; set; }
        public string? WaWabaId { get; set; }
        public string? WaAccessToken { get; set; }
        public string? WaVerifyToken { get; set; }
        public string? WaAppSecret { get; set; }
        public bool WaConnected { get; set; }
        public string? IgAccountId { get; set; }
        public string? IgPageId { get; set; }
        public string? IgAccessToken { get; set; }
        public DateTime? IgTokenExpiresAt { get; set; }
        public bool IgConnected { get; set; }
        public string? MpAccessTokenProd { get; set; }
        public string? MpAccessTokenSandbox { get; set; }
        public string? MpPublicKeyProd { get; set; }
        public string? MpWebhookSecret { get; set; }
        public bool MpConnected { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? GmailHistoryId { get; set; }
        public bool MpSandboxMode { get; set; }
    }
}
