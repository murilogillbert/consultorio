using System.Security.Claims;
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
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;
    private readonly GoogleOAuthService _googleOAuth;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext db, TokenService tokenService, GoogleOAuthService googleOAuth, IEmailService emailService, ILogger<AuthController> logger)
    {
        _db = db;
        _tokenService = tokenService;
        _googleOAuth = googleOAuth;
        _emailService = emailService;
        _logger = logger;
    }

    // ─── POST /api/auth/login ──────────────────────────────────────────
    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        // Identificador pode vir em Username ou em Email (compat). Tenta resolver
        // primeiro como username (único globalmente quando não-null), depois
        // como email. Se houver múltiplos usuários com o mesmo email (caso de
        // pacientes), retorna ambíguo orientando o uso do username.
        var identifier = !string.IsNullOrWhiteSpace(dto.Username) ? dto.Username : dto.Email;
        if (string.IsNullOrWhiteSpace(identifier))
            return Unauthorized(new { message = "Informe e-mail ou usuário." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == identifier);
        if (user == null)
        {
            var byEmail = await _db.Users
                .Where(u => u.Email == identifier && u.IsActive)
                .ToListAsync();
            if (byEmail.Count > 1)
                return Unauthorized(new { message = "Há múltiplas contas com este e-mail. Utilize seu nome de usuário." });
            user = byEmail.FirstOrDefault();
        }
        if (user == null)
            return Unauthorized(new { message = "Email ou senha inválidos." });

        // BCrypt.Verify compara a senha digitada com o hash salvo no banco
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Email ou senha inválidos." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Usuário desativado." });

        // Busca o perfil do sistema (SystemUser) para saber a role e clínica (admin/recepcionista)
        var systemUser = await _db.SystemUsers.FirstOrDefaultAsync(su => su.UserId == user.Id);

        if (systemUser != null)
        {
            // Usuário de staff (ADMIN ou RECEPTIONIST)
            var staffToken = _tokenService.GenerateToken(user.Id, user.Email, systemUser.Role, systemUser.ClinicId);
            return Ok(new AuthResponseDto
            {
                Token = staffToken,
                User = new UserInfoDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Username = user.Username,
                    Role = systemUser.Role,
                    ClinicId = systemUser.ClinicId,
                    AvatarUrl = user.AvatarUrl
                }
            });
        }

        // Verifica se é um profissional
        var professional = await _db.Professionals.FirstOrDefaultAsync(p => p.UserId == user.Id);

        if (professional != null)
        {
            // Profissional — recebe role PROFESSIONAL, clinicId e professionalId no token
            var proToken = _tokenService.GenerateToken(
                user.Id, user.Email, "PROFESSIONAL",
                professional.ClinicId, professional.Id
            );
            return Ok(new AuthResponseDto
            {
                Token = proToken,
                User = new UserInfoDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Username = user.Username,
                    Role = "PROFESSIONAL",
                    ClinicId = professional.ClinicId,
                    ProfessionalId = professional.Id,
                    AvatarUrl = user.AvatarUrl
                }
            });
        }

        // Verifica se é paciente (Patient portal unificado)
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.UserId == user.Id);

        if (patient != null)
        {
            // Paciente via portal unificado — usa GeneratePatientToken para incluir patientId
            var patientToken = _tokenService.GeneratePatientToken(user.Id, user.Email, patient.Id);
            return Ok(new AuthResponseDto
            {
                Token = patientToken,
                User = new UserInfoDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Username = user.Username,
                    Role = "PATIENT",
                    PatientId = patient.Id,
                    AvatarUrl = user.AvatarUrl
                }
            });
        }

        // Fallback — usuário sem perfil associado
        var fallbackToken = _tokenService.GenerateToken(user.Id, user.Email, "PATIENT", null);
        return Ok(new AuthResponseDto
        {
            Token = fallbackToken,
            User = new UserInfoDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = "PATIENT",
                AvatarUrl = user.AvatarUrl
            }
        });
    }

    // ─── POST /api/auth/register ───────────────────────────────────────
    // Cria um novo usuário do sistema (admin ou recepcionista)
    [HttpPost("google/start")]
    [Authorize]
    public async Task<ActionResult<GoogleOAuthStartResponseDto>> StartGoogleOAuth([FromBody] GoogleOAuthStartRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { message = "Usuário não autenticado." });

        try
        {
            var result = await _googleOAuth.CreateAuthorizationUrlAsync(Request, dto.ClinicId, userId, dto.ReturnUrl);
            return Ok(new GoogleOAuthStartResponseDto
            {
                AuthUrl = result.AuthUrl,
                RedirectUri = result.RedirectUri,
            });
        }
        catch (GoogleOAuthException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpGet("google/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleCallback()
    {
        try
        {
            var redirectUrl = await _googleOAuth.HandleCallbackAsync(Request);
            return Redirect(redirectUrl);
        }
        catch (GoogleOAuthException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        // Verifica se o email já existe entre usuários ATIVOS de staff/profissional.
        // Pacientes inativos (soft-deleted) não bloqueiam o reuso.
        var exists = await _db.Users
            .AnyAsync(u => u.Email == dto.Email && u.IsActive
                           && (u.SystemUser != null || u.Professional != null));
        if (exists)
            return Conflict(new { message = "Email já cadastrado." });

        // Verifica se a clínica existe
        var clinic = await _db.Clinics.FindAsync(dto.ClinicId);
        if (clinic == null)
            return BadRequest(new { message = "Clínica não encontrada." });

        // BCrypt.HashPassword gera um hash seguro da senha
        // O salt é gerado automaticamente e fica embutido no hash
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var systemUser = new SystemUser
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            ClinicId = dto.ClinicId,
            Role = dto.Role,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        _db.SystemUsers.Add(systemUser);
        await _db.SaveChangesAsync();

        // Gera o token para login automático após registro
        var token = _tokenService.GenerateToken(user.Id, user.Email, dto.Role, dto.ClinicId);

        return CreatedAtAction(nameof(Login), new AuthResponseDto
        {
            Token = token,
            User = new UserInfoDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Username = user.Username,
                Role = dto.Role,
                ClinicId = dto.ClinicId,
                AvatarUrl = null
            }
        });
    }

    // ─── POST /api/auth/forgot-password ────────────────────────────────
    // Generates a 6-digit code, stores it on User.OtpCode/OtpExpiry, and
    // emails it. Always returns a generic success message to avoid leaking
    // which emails exist in the system.
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        const string genericMessage = "Se houver uma conta com esse e-mail, enviaremos um codigo de recuperacao.";

        if (string.IsNullOrWhiteSpace(dto.Email))
            return Ok(new { message = genericMessage });

        var users = await _db.Users
            .Include(u => u.SystemUser)
            .Include(u => u.Patient)
            .Where(u => u.Email == dto.Email && u.IsActive)
            .ToListAsync();

        if (users.Count == 0)
            return Ok(new { message = genericMessage });

        var rng = new Random();
        var code = rng.Next(100000, 999999).ToString();
        var expiry = DateTime.UtcNow.AddMinutes(15);

        foreach (var u in users)
        {
            u.OtpCode = code;
            u.OtpExpiry = expiry;
            u.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();

        // Resolve per-clinic SMTP override (SystemUser or Patient → ClinicId)
        var clinicId = users
            .Select(u => u.SystemUser?.ClinicId ?? u.Patient?.ClinicId)
            .FirstOrDefault(id => id.HasValue);

        SmtpOverride? smtpOverride = null;
        ResendOverride? resendOverride = null;
        if (clinicId.HasValue)
        {
            var clinic = await _db.Clinics.FindAsync(clinicId.Value);
            if (clinic != null &&
                !string.IsNullOrWhiteSpace(clinic.ResendApiKey) &&
                !string.IsNullOrWhiteSpace(clinic.ResendFromEmail))
            {
                resendOverride = new ResendOverride(
                    clinic.ResendApiKey,
                    clinic.ResendFromEmail,
                    clinic.ResendFromName);
            }
            else if (clinic != null &&
                !string.IsNullOrWhiteSpace(clinic.SmtpHost) &&
                !string.IsNullOrWhiteSpace(clinic.SmtpPassword))
            {
                smtpOverride = new SmtpOverride(
                    clinic.SmtpHost,
                    clinic.SmtpPort ?? 587,
                    clinic.SmtpUsername ?? "",
                    clinic.SmtpPassword,
                    clinic.SmtpFrom ?? clinic.SmtpUsername ?? "");
            }
        }

        var html = $@"
            <h2>Recuperação de acesso</h2>
            <p>Use o código abaixo para redefinir sua senha. Ele expira em 15 minutos.</p>
            <p style='font-size:24px;font-weight:bold;letter-spacing:4px'>{code}</p>
            <p>Se você não solicitou esta recuperação, ignore este e-mail.</p>";

        try
        {
            await _emailService.SendAsync(dto.Email, "Código de recuperação de acesso", html, smtpOverride, resendOverride);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao enviar e-mail de recuperação para {Email}", dto.Email);
            // Falha de envio não deve revelar nada ao cliente.
        }

        return Ok(new { message = genericMessage });
    }

    // Validates the recovery code before showing the password fields in the UI.
    [HttpPost("verify-reset-code")]
    [AllowAnonymous]
    public async Task<ActionResult> VerifyResetCode([FromBody] VerifyResetCodeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest(new { message = "Informe e-mail e codigo." });

        var hasValidCode = await _db.Users
            .AnyAsync(u => u.Email == dto.Email && u.IsActive && u.OtpCode == dto.Code && u.OtpExpiry > DateTime.UtcNow);

        if (!hasValidCode)
            return BadRequest(new { message = "Codigo invalido ou expirado." });

        return Ok(new { ok = true, message = "Codigo confirmado." });
    }

    // Validates the code, updates the password, and clears the OTP fields.
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Code) || string.IsNullOrWhiteSpace(dto.NewPassword))
            return BadRequest(new { message = "Todos os campos são obrigatórios." });
        if (dto.NewPassword.Length < 6)
            return BadRequest(new { message = "A nova senha deve ter pelo menos 6 caracteres." });

        var users = await _db.Users
            .Where(u => u.Email == dto.Email && u.IsActive && u.OtpCode == dto.Code && u.OtpExpiry > DateTime.UtcNow)
            .ToListAsync();

        if (users.Count == 0)
            return BadRequest(new { message = "Código inválido ou expirado." });

        var hashed = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        foreach (var u in users)
        {
            u.PasswordHash = hashed;
            u.OtpCode = null;
            u.OtpExpiry = null;
            u.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();

        return Ok(new { message = "Senha atualizada com sucesso." });
    }
}
