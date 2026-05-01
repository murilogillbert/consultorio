using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/system-users")]
[Authorize]
public class SystemUsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public SystemUsersController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Clínica não identificada." });

        var users = await _db.SystemUsers
            .Include(su => su.User)
            .Where(su => su.ClinicId == clinicId)
            .OrderBy(su => su.User.Name)
            .ToListAsync();

        return Ok(users.Select(ToResponse));
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateSystemUserDto dto)
    {
        var clinicId = dto.ClinicId != Guid.Empty ? dto.ClinicId : GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Clínica não identificada." });

        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Nome e e-mail são obrigatórios." });

        var email = dto.Email.Trim().ToLowerInvariant();

        var password = string.IsNullOrWhiteSpace(dto.Password)
            ? "123456"
            : dto.Password.Trim();

        var role = NormalizeRole(dto.Role);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Phone = dto.Phone?.Trim(),
            IsActive = dto.Active,
            CreatedAt = DateTime.UtcNow,
        };

        var systemUser = new SystemUser
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            ClinicId = clinicId,
            Role = role,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        _db.SystemUsers.Add(systemUser);
        await _db.SaveChangesAsync();

        var response = ToResponse(systemUser, user);
        response.GeneratedPassword = password;
        return Ok(response);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateSystemUserDto dto)
    {
        var systemUser = await _db.SystemUsers
            .Include(su => su.User)
            .FirstOrDefaultAsync(su => su.Id == id);

        if (systemUser == null)
            return NotFound(new { message = "Usuário não encontrado." });

        if (!string.IsNullOrWhiteSpace(dto.Name))
            systemUser.User.Name = dto.Name.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            systemUser.User.Email = dto.Email.Trim().ToLowerInvariant();
        }

        if (!string.IsNullOrWhiteSpace(dto.Role))
            systemUser.Role = NormalizeRole(dto.Role);

        if (dto.Active.HasValue)
            systemUser.User.IsActive = dto.Active.Value;

        if (!string.IsNullOrWhiteSpace(dto.Phone))
            systemUser.User.Phone = dto.Phone.Trim();

        // Troca de senha por admin: hash com BCrypt antes de salvar.
        // Mínimo de 6 caracteres é validado aqui mesmo para evitar
        // senhas excessivamente fracas vindas da UI.
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            var pwd = dto.Password.Trim();
            if (pwd.Length < 6)
                return BadRequest(new { message = "A senha deve ter ao menos 6 caracteres." });
            systemUser.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(pwd);
        }

        systemUser.UpdatedAt = DateTime.UtcNow;
        systemUser.User.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ToResponse(systemUser));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var systemUser = await _db.SystemUsers.FindAsync(id);

        if (systemUser == null)
            return NotFound(new { message = "Usuário não encontrado." });

        _db.SystemUsers.Remove(systemUser);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static SystemUserResponseDto ToResponse(SystemUser su) => ToResponse(su, su.User);

    private static SystemUserResponseDto ToResponse(SystemUser su, User user) => new()
    {
        Id = su.Id,
        ClinicId = su.ClinicId,
        UserId = su.UserId,
        Role = su.Role,
        Active = user.IsActive,
        CreatedAt = su.CreatedAt,
        User = new SystemUserUserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Phone = user.Phone,
            Active = user.IsActive,
        },
        Permissions = new Dictionary<string, bool>(),
    };

    private static string NormalizeRole(string? role)
    {
        return string.Equals(role, "ADMIN", StringComparison.OrdinalIgnoreCase)
            ? "ADMIN"
            : "RECEPTIONIST";
    }

}

public class CreateSystemUserDto
{
    public Guid ClinicId { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = "RECEPTIONIST";
    public bool Active { get; set; } = true;
    public string? Password { get; set; }
    public string? Phone { get; set; }
    public Dictionary<string, bool>? Permissions { get; set; }
}

public class UpdateSystemUserDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Role { get; set; }
    public bool? Active { get; set; }
    public string? Password { get; set; }
    public Dictionary<string, bool>? Permissions { get; set; }
}

public class SystemUserResponseDto
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = null!;
    public bool Active { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? GeneratedPassword { get; set; }
    public SystemUserUserDto User { get; set; } = null!;
    public Dictionary<string, bool> Permissions { get; set; } = new();
}

public class SystemUserUserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public bool Active { get; set; }
}
