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

    public AuthController(AppDbContext db, TokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
    }

    // ─── POST /api/auth/login ──────────────────────────────────────────
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        // Busca o usuário pelo email
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return Unauthorized(new { message = "Email ou senha inválidos." });

        // BCrypt.Verify compara a senha digitada com o hash salvo no banco
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Email ou senha inválidos." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Usuário desativado." });

        // Busca o perfil do sistema (SystemUser) para saber a role e clínica
        var systemUser = await _db.SystemUsers.FirstOrDefaultAsync(su => su.UserId == user.Id);

        var role = systemUser?.Role ?? "PATIENT";
        var clinicId = systemUser?.ClinicId;

        // Gera o token JWT
        var token = _tokenService.GenerateToken(user.Id, user.Email, role, clinicId);

        return Ok(new AuthResponseDto
        {
            Token = token,
            User = new UserInfoDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = role,
                ClinicId = clinicId,
                AvatarUrl = user.AvatarUrl
            }
        });
    }

    // ─── POST /api/auth/register ───────────────────────────────────────
    // Cria um novo usuário do sistema (admin ou recepcionista)
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        // Verifica se o email já existe
        var exists = await _db.Users.AnyAsync(u => u.Email == dto.Email);
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
                Role = dto.Role,
                ClinicId = dto.ClinicId,
                AvatarUrl = null
            }
        });
    }
}
