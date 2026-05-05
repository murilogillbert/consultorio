using System.Net;
using System.Net.Mail;

namespace Consultorio.API.Services;

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody);
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

    public async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var host = _config["Smtp:Host"];
        var port = int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
        var username = _config["Smtp:Username"];
        var password = _config["Smtp:Password"];
        var from = _config["Smtp:From"] ?? username;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(from))
            throw new InvalidOperationException("SMTP não configurado. Defina Smtp:Host, Smtp:Username e Smtp:From no servidor.");

        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("SMTP sem senha configurada. Gere um App Password do Gmail e defina em Smtp:Password no servidor.");

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
