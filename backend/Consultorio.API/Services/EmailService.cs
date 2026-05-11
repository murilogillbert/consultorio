using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

namespace Consultorio.API.Services;

public record SmtpOverride(string Host, int Port, string Username, string Password, string From);
public record ResendOverride(string ApiKey, string FromEmail, string? FromName = null);

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody, SmtpOverride? smtp = null, ResendOverride? resend = null);
}

public class EmailService : IEmailService
{
    private static readonly HttpClient ResendHttp = new()
    {
        BaseAddress = new Uri("https://api.resend.com"),
        Timeout = TimeSpan.FromSeconds(15),
    };
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody, SmtpOverride? smtp = null, ResendOverride? resend = null)
    {
        var resendApiKey = resend?.ApiKey ?? _config["Resend:ApiKey"];
        var resendFromEmail = resend?.FromEmail ?? _config["Resend:FromEmail"];
        var resendFromName = resend?.FromName ?? _config["Resend:FromName"];

        if (!string.IsNullOrWhiteSpace(resendApiKey) && !string.IsNullOrWhiteSpace(resendFromEmail))
        {
            await SendWithResendAsync(toEmail, subject, htmlBody, resendApiKey, resendFromEmail, resendFromName);
            return;
        }

        // Per-clinic DB settings take priority; fall back to appsettings
        var host     = smtp?.Host     ?? _config["Smtp:Host"];
        var port     = smtp?.Port     ?? (int.TryParse(_config["Smtp:Port"], out var p) ? p : 587);
        var username = smtp?.Username ?? _config["Smtp:Username"];
        var password = smtp?.Password ?? _config["Smtp:Password"];
        var from     = smtp?.From     ?? _config["Smtp:From"] ?? username;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(from))
            throw new InvalidOperationException("SMTP não configurado. Configure em Integrações ou defina Smtp:Host, Smtp:Username e Smtp:From no servidor.");

        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("SMTP sem senha configurada. Configure em Integrações > E-mail (SMTP) ou defina Smtp:Password no servidor.");

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(username, password),
            // Timeout default do .NET é 100s, o que deixa a UI parecendo travada.
            // 15s é suficiente pra detectar host inacessível, porta bloqueada
            // ou TLS falhando — sem prender o usuário esperando.
            Timeout = 15000
        };

        using var msg = new MailMessage(from, toEmail, subject, htmlBody)
        {
            IsBodyHtml = true
        };

        var startedAt = DateTime.UtcNow;
        _logger.LogInformation(
            "SMTP send starting. Host={Host}, Port={Port}, Username={Username}, From={From}, To={ToEmail}, TimeoutMs={TimeoutMs}",
            host,
            port,
            username,
            from,
            toEmail,
            client.Timeout);

        try
        {
            await client.SendMailAsync(msg);
            _logger.LogInformation(
                "SMTP send completed. Host={Host}, Port={Port}, To={ToEmail}, ElapsedMs={ElapsedMs}",
                host,
                port,
                toEmail,
                (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "SMTP send failed. Host={Host}, Port={Port}, Username={Username}, From={From}, To={ToEmail}, ElapsedMs={ElapsedMs}",
                host,
                port,
                username,
                from,
                toEmail,
                (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
            throw;
        }
    }

    private async Task SendWithResendAsync(string toEmail, string subject, string htmlBody, string apiKey, string fromEmail, string? fromName)
    {
        var payload = new
        {
            from = FormatFrom(fromEmail, fromName),
            to = new[] { toEmail },
            subject,
            html = htmlBody,
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "/emails")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
        request.Headers.UserAgent.ParseAdd("Consultorio.API/1.0");

        var startedAt = DateTime.UtcNow;
        _logger.LogInformation(
            "Resend email send starting. From={From}, To={ToEmail}, TimeoutMs={TimeoutMs}",
            payload.from,
            toEmail,
            (int)ResendHttp.Timeout.TotalMilliseconds);

        try
        {
            using var response = await ResendHttp.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                var message = ExtractResendError(body) ?? $"Resend returned HTTP {(int)response.StatusCode}.";
                throw new ResendEmailException((int)response.StatusCode, message);
            }

            _logger.LogInformation(
                "Resend email send completed. From={From}, To={ToEmail}, StatusCode={StatusCode}, ElapsedMs={ElapsedMs}",
                payload.from,
                toEmail,
                (int)response.StatusCode,
                (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Resend email send failed. From={From}, To={ToEmail}, ElapsedMs={ElapsedMs}",
                payload.from,
                toEmail,
                (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
            throw;
        }
    }

    private static string FormatFrom(string fromEmail, string? fromName)
    {
        var email = fromEmail.Trim();
        var name = fromName?.Trim()
            .Replace("<", "", StringComparison.Ordinal)
            .Replace(">", "", StringComparison.Ordinal)
            .Replace("\r", "", StringComparison.Ordinal)
            .Replace("\n", "", StringComparison.Ordinal);

        return string.IsNullOrWhiteSpace(name) ? email : $"{name} <{email}>";
    }

    private static string? ExtractResendError(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
            return null;

        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;
            if (root.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.String)
                return message.GetString();
            if (root.TryGetProperty("error", out var error))
            {
                if (error.ValueKind == JsonValueKind.String)
                    return error.GetString();
                if (error.ValueKind == JsonValueKind.Object &&
                    error.TryGetProperty("message", out var nestedMessage) &&
                    nestedMessage.ValueKind == JsonValueKind.String)
                    return nestedMessage.GetString();
            }
        }
        catch
        {
        }

        return body.Length > 500 ? body[..500] : body;
    }
}

public class ResendEmailException : Exception
{
    public int StatusCode { get; }

    public ResendEmailException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}
