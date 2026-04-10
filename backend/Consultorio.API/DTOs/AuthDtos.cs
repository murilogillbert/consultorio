namespace Consultorio.API.DTOs;

// DTO para login
public class LoginDto
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
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

// Informações do usuário retornadas junto com o token
public class UserInfoDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = null!;
    public Guid? ClinicId { get; set; }
    public string? AvatarUrl { get; set; }
}
