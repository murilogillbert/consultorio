using System.Net;
using System.Net.Mail;

namespace Consultorio.API.Services;

public record SmtpOverride(string Host, int Port, string Username, string Password, string From);

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody, SmtpOverride? smtp = null);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody, SmtpOverride? smtp = null)
    {
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
            Credentials = new NetworkCredential(username, password)
        };

        using var msg = new MailMessage(from, toEmail, subject, htmlBody)
        {
            IsBodyHtml = true
        };

        try
        {
            await client.SendMailAsync(msg);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            throw;
        }
    }
}
