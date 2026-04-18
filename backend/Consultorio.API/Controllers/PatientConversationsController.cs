using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

/// <summary>
/// Endpoints da recepção para gerenciar mensagens trocadas com pacientes.
/// </summary>
[ApiController]
[Route("api/patient-conversations")]
[Authorize]
public class PatientConversationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public PatientConversationsController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : Guid.Empty;

    // ─── GET /api/patient-conversations ──────────────────────────────────────
    // Lista todos os pacientes que enviaram ao menos uma mensagem, com a mais recente.
    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Clínica não identificada." });

        var conversations = await _db.PatientMessages
            .Where(m => m.ClinicId == clinicId)
            .GroupBy(m => m.PatientId)
            .Select(g => new
            {
                patientId     = g.Key,
                lastMessageAt = g.Max(m => m.CreatedAt),
                unreadCount   = g.Count(m => !m.IsRead && m.Direction == "IN"),
                lastMessage   = g.OrderByDescending(m => m.CreatedAt)
                                 .Select(m => m.Content)
                                 .FirstOrDefault(),
                source        = g.OrderByDescending(m => m.CreatedAt)
                                 .Select(m => m.Source)
                                 .FirstOrDefault(),
            })
            .OrderByDescending(c => c.lastMessageAt)
            .ToListAsync();

        // Enriquece com dados do paciente
        var patientIds = conversations.Select(c => c.patientId).ToList();
        var patients = await _db.Patients
            .Include(p => p.User)
            .Where(p => patientIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        var result = conversations.Select(c =>
        {
            patients.TryGetValue(c.patientId, out var p);
            return new
            {
                patientId     = c.patientId,
                patientName   = p?.User?.Name ?? "Paciente",
                patientEmail  = p?.User?.Email,
                lastMessageAt = c.lastMessageAt,
                unreadCount   = c.unreadCount,
                lastMessage   = c.lastMessage,
                source        = string.IsNullOrWhiteSpace(c.source) ? "APP" : c.source,
            };
        });

        return Ok(result);
    }

    // ─── GET /api/patient-conversations/{patientId}/messages ─────────────────
    [HttpGet("{patientId}/messages")]
    public async Task<ActionResult> GetMessages(Guid patientId)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Clínica não identificada." });

        var messages = await _db.PatientMessages
            .Where(m => m.PatientId == patientId && m.ClinicId == clinicId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                id           = m.Id,
                direction    = m.Direction,
                content      = m.Content,
                isRead       = m.IsRead,
                source       = m.Source,
                createdAt    = m.CreatedAt,
                sentByUserId = m.SentByUserId,
            })
            .ToListAsync();

        // Marca mensagens do paciente como lidas
        var unread = await _db.PatientMessages
            .Where(m => m.PatientId == patientId && m.ClinicId == clinicId && !m.IsRead && m.Direction == "IN")
            .ToListAsync();
        foreach (var m in unread) m.IsRead = true;
        if (unread.Any()) await _db.SaveChangesAsync();

        // Info do paciente
        var patient = await _db.Patients.Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == patientId && p.ClinicId == clinicId);

        return Ok(new
        {
            patient = patient == null ? null : new
            {
                id    = patient.Id,
                name  = patient.User?.Name,
                email = patient.User?.Email,
                phone = patient.Phone,
            },
            messages,
        });
    }

    // ─── POST /api/patient-conversations/{patientId}/reply ───────────────────
    [HttpPost("{patientId}/reply")]
    public async Task<ActionResult> Reply(Guid patientId, [FromBody] ReplyToPatientDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Clínica não identificada." });

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Mensagem não pode estar vazia." });

        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Id == patientId && p.ClinicId == clinicId);
        if (patient == null) return NotFound(new { message = "Paciente não encontrado." });

        var msg = new PatientMessage
        {
            Id           = Guid.NewGuid(),
            PatientId    = patientId,
            ClinicId     = clinicId,
            Content      = dto.Content.Trim(),
            Direction    = "OUT",
            Source       = await _db.PatientMessages
                .Where(m => m.PatientId == patientId && m.ClinicId == clinicId)
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => m.Source)
                .FirstOrDefaultAsync() ?? "APP",
            SentByUserId = GetUserId() != Guid.Empty ? GetUserId() : null,
            IsRead       = true,
            CreatedAt    = DateTime.UtcNow,
        };

        _db.PatientMessages.Add(msg);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id           = msg.Id,
            direction    = msg.Direction,
            content      = msg.Content,
            isRead       = msg.IsRead,
            source       = msg.Source,
            createdAt    = msg.CreatedAt,
            sentByUserId = msg.SentByUserId,
        });
    }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

public class ReplyToPatientDto
{
    public string Content { get; set; } = null!;
}
