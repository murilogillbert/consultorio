using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Consultorio.API.Services;

// Responsável por gerar e validar tokens JWT
public class TokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    // Gera um token JWT com as informações do usuário embutidas (claims)
    public string GenerateToken(Guid userId, string email, string role, Guid? clinicId)
    {
        // A chave secreta vem do appsettings.json
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!)
        );

        // Claims são informações que ficam "dentro" do token
        // O frontend pode ler essas informações sem chamar a API
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role),
        };

        // Adiciona o ClinicId como claim se existir
        if (clinicId.HasValue)
            claims.Add(new Claim("clinicId", clinicId.Value.ToString()));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(12), // Token válido por 12 horas
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        // Serializa o token para string (o que o frontend vai armazenar)
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // Token específico para o portal do paciente (sem clinicId, com patientId)
    public string GeneratePatientToken(Guid userId, string email, Guid patientId)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!)
        );

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, "PATIENT"),
            new Claim("patientId", patientId.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
