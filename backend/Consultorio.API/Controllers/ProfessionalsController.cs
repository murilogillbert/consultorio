using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.API.DTOs;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfessionalsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProfessionalsController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    // Método auxiliar para converter Professional + User em DTO
    private static ProfessionalResponseDto ToDto(Professional p) => new()
    {
        Id = p.Id,
        UserId = p.UserId,
        Name = p.User.Name,
        Email = p.User.Email,
        Phone = p.User.Phone,
        AvatarUrl = p.User.AvatarUrl,
        LicenseNumber = p.LicenseNumber,
        Specialty = p.Specialty,
        Bio = p.Bio,
        IsAvailable = p.IsAvailable,
        CommissionPct = p.CommissionPct,
        CreatedAt = p.CreatedAt,
        Services = p.Services.Select(s => s.Name).ToList(),
        ServiceIds = p.Services.Select(s => s.Id).ToList(),
        Schedules = p.Schedules
            .Where(s => s.IsActive)
            .OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime)
            .Select(s => new ProfessionalScheduleDto
            {
                Id = s.Id,
                DayOfWeek = s.DayOfWeek,
                StartTime = s.StartTime.ToString(@"hh\:mm"),
                EndTime = s.EndTime.ToString(@"hh\:mm"),
            }).ToList()
    };

    // GET /api/professionals — público para o site mostrar profissionais
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ProfessionalResponseDto>>> GetAll()
    {
        var pros = await _db.Professionals
            .Include(p => p.User)
            .Include(p => p.Services)
            .Include(p => p.Schedules)
            .Where(p => p.IsAvailable && p.User.IsActive)
            .OrderBy(p => p.User.Name)
            .ToListAsync();

        return Ok(pros.Select(ToDto));
    }

    // GET /api/professionals/{id}
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProfessionalResponseDto>> GetById(Guid id)
    {
        var pro = await _db.Professionals
            .Include(p => p.User)
            .Include(p => p.Services)
            .Include(p => p.Schedules)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pro == null)
            return NotFound(new { message = "Profissional não encontrado." });

        return Ok(ToDto(pro));
    }

    // POST /api/professionals — cria User + Professional
    [HttpPost]
    public async Task<ActionResult<ProfessionalResponseDto>> Create([FromBody] CreateProfessionalDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não vinculado a uma clínica." });

        // Verifica se email já existe entre usuários ATIVOS de staff/profissional.
        // Pacientes inativos não bloqueiam reuso.
        if (await _db.Users.AnyAsync(u => u.Email == dto.Email && u.IsActive
                                          && (u.SystemUser != null || u.Professional != null)))
            return Conflict(new { message = "Email já cadastrado." });

        // Cria o User base
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Phone = dto.Phone,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // Cria o perfil Professional vinculado ao User
        var pro = new Professional
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            UserId = user.Id,
            LicenseNumber = dto.LicenseNumber,
            Specialty = dto.Specialty,
            Bio = dto.Bio,
            CommissionPct = dto.CommissionPct ?? 50,
            IsAvailable = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        _db.Professionals.Add(pro);
        await _db.SaveChangesAsync();

        // Recarrega com Include para montar o DTO completo
        pro.User = user;
        pro.Services = new List<Service>();

        return CreatedAtAction(nameof(GetById), new { id = pro.Id }, ToDto(pro));
    }

    // PUT /api/professionals/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<ProfessionalResponseDto>> Update(Guid id, [FromBody] UpdateProfessionalDto dto)
    {
        var pro = await _db.Professionals
            .Include(p => p.User)
            .Include(p => p.Services)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pro == null)
            return NotFound(new { message = "Profissional não encontrado." });

        // Atualiza dados do User
        if (dto.Name != null) pro.User.Name = dto.Name;
        if (dto.Phone != null) pro.User.Phone = dto.Phone;
        if (dto.AvatarUrl != null) pro.User.AvatarUrl = dto.AvatarUrl;
        pro.User.UpdatedAt = DateTime.UtcNow;

        // Atualiza dados do Professional
        if (dto.LicenseNumber != null) pro.LicenseNumber = dto.LicenseNumber;
        if (dto.Specialty != null) pro.Specialty = dto.Specialty;
        if (dto.Bio != null) pro.Bio = dto.Bio;
        if (dto.IsAvailable.HasValue) pro.IsAvailable = dto.IsAvailable.Value;
        if (dto.CommissionPct.HasValue) pro.CommissionPct = dto.CommissionPct.Value;
        pro.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(ToDto(pro));
    }

    // DELETE /api/professionals/{id} — exclui profissional.
    // Soft delete quando há agendamentos (preserva histórico/financeiro);
    // hard delete caso contrário. Sempre desativa o User vinculado para
    // liberar reuso de e-mail em futuras criações.
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var pro = await _db.Professionals
            .Include(p => p.User)
            .Include(p => p.Schedules)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (pro == null)
            return NotFound(new { message = "Profissional não encontrado." });

        var hasAppointments = await _db.Appointments.AnyAsync(a => a.ProfessionalId == id);

        if (hasAppointments)
        {
            pro.IsAvailable = false;
            pro.UpdatedAt = DateTime.UtcNow;
            if (pro.User != null)
            {
                pro.User.IsActive = false;
                pro.User.UpdatedAt = DateTime.UtcNow;
            }
            foreach (var s in pro.Schedules)
                s.IsActive = false;
            await _db.SaveChangesAsync();
            return Ok(new { mode = "soft", message = "Profissional inativado. Histórico de agendamentos preservado." });
        }

        if (pro.User != null)
            _db.Users.Remove(pro.User);
        _db.Professionals.Remove(pro);
        await _db.SaveChangesAsync();
        return Ok(new { mode = "hard", message = "Profissional excluído." });
    }

    // POST /api/professionals/{id}/services/{serviceId} — vincular serviço
    [HttpPost("{id}/services/{serviceId}")]
    public async Task<ActionResult> AddService(Guid id, Guid serviceId)
    {
        var pro = await _db.Professionals
            .Include(p => p.Services)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pro == null)
            return NotFound(new { message = "Profissional não encontrado." });

        var service = await _db.Services.FindAsync(serviceId);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        if (pro.Services.Any(s => s.Id == serviceId))
            return Conflict(new { message = "Serviço já vinculado." });

        pro.Services.Add(service);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Serviço vinculado com sucesso." });
    }

    // DELETE /api/professionals/{id}/services/{serviceId} — desvincular
    [HttpDelete("{id}/services/{serviceId}")]
    public async Task<ActionResult> RemoveService(Guid id, Guid serviceId)
    {
        var pro = await _db.Professionals
            .Include(p => p.Services)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pro == null)
            return NotFound(new { message = "Profissional não encontrado." });

        var service = pro.Services.FirstOrDefault(s => s.Id == serviceId);
        if (service == null)
            return NotFound(new { message = "Serviço não vinculado." });

        pro.Services.Remove(service);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
