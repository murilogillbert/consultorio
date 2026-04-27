namespace Consultorio.API.DTOs;

// DTO para login. Aceita email ou username no campo "Email" (mantido por
// compatibilidade) ou no novo campo "Identifier". O backend resolve por
// username primeiro (uniqueness garantida) e fallback para email.
public class LoginDto
{
    public string Email { get; set; } = null!;
    public string? Username { get; set; }
    public string Password { get; set; } = null!;
}

public class ForgotPasswordDto
{
    public string Email { get; set; } = null!;
}

public class ResetPasswordDto
{
    public string Email { get; set; } = null!;
    public string Code { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}

// DTO para registro de usuário do sistema (admin/recepcionista)
public class RegisterDto
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string Role { get; set; } = "RECEPTIONIST"; // ADMIN ou RECEPTIONIST
    public Guid ClinicId { get; set; }
}

// DTO de resposta do login — contém o token JWT
public class AuthResponseDto
{
    public string Token { get; set; } = null!;
    public UserInfoDto User { get; set; } = null!;
}

public class GoogleOAuthStartRequestDto
{
    public Guid ClinicId { get; set; }
    public string? ReturnUrl { get; set; }
}

public class GoogleOAuthStartResponseDto
{
    public string AuthUrl { get; set; } = null!;
    public string RedirectUri { get; set; } = null!;
}

// Informações do usuário retornadas junto com o token
public class UserInfoDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Username { get; set; }
    public string Role { get; set; } = null!;
    public Guid? ClinicId { get; set; }
    public Guid? ProfessionalId { get; set; }
    public Guid? PatientId { get; set; }
    public string? AvatarUrl { get; set; }
}
