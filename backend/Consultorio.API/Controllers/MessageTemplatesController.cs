using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.API.DTOs;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

/// <summary>
/// CRUD per-clinic dos templates de mensagem (CONFIRMATION, REMINDER,
/// POST_APPOINTMENT, BIRTHDAY). O <c>GET</c> sempre retorna os 4 — campos
/// não persistidos no banco vêm preenchidos com defaults.
/// </summary>
[ApiController]
[Route("api/message-templates")]
[Authorize]
public class MessageTemplatesController : ControllerBase
{
    private readonly AppDbContext _db;

    public MessageTemplatesController(AppDbContext db) => _db = db;

    private Guid GetClinicId() =>
        Guid.TryParse(User.FindFirst("clinicId")?.Value, out var id) ? id : Guid.Empty;

    public static readonly IReadOnlyDictionary<string, string> KindDefaults = new Dictionary<string, string>
    {
        ["CONFIRMATION"]     = "Olá {nome}, sua consulta de {servico} está confirmada para {data} às {hora}. Clínica Vitalis.",
        ["REMINDER"]         = "Olá {nome}, sua consulta de {servico} está agendada para {data} às {hora}. Clínica Vitalis.",
        ["POST_APPOINTMENT"] = "Olá {nome}, obrigado por realizar sua consulta de {servico} em {data} às {hora}. Clínica Vitalis.",
        ["BIRTHDAY"]         = "Olá {nome}, a Clínica Vitalis deseja um feliz aniversário! Que seu dia seja especial.",
    };

    public static readonly IReadOnlyDictionary<string, string[]> KindVariables = new Dictionary<string, string[]>
    {
        ["CONFIRMATION"]     = new[] { "nome", "servico", "data", "hora", "profissional" },
        ["REMINDER"]         = new[] { "nome", "servico", "data", "hora", "profissional" },
        ["POST_APPOINTMENT"] = new[] { "nome", "servico", "data", "hora", "profissional" },
        ["BIRTHDAY"]         = new[] { "nome" },
    };

    // GET /api/message-templates
    [HttpGet]
    public async Task<ActionResult<List<MessageTemplateResponseDto>>> GetAll()
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Clínica não identificada." });

        var stored = await _db.MessageTemplates
            .Where(t => t.ClinicId == clinicId)
            .ToListAsync();

        var byKind = stored.ToDictionary(t => t.Kind.ToUpperInvariant(), t => t);
        var result = KindDefaults.Select(kv =>
        {
            byKind.TryGetValue(kv.Key, out var existing);
            return new MessageTemplateResponseDto
            {
                Kind        = kv.Key,
                Body        = existing?.Body ?? kv.Value,
                IsDefault   = existing == null,
                Variables   = KindVariables.TryGetValue(kv.Key, out var v) ? v : Array.Empty<string>(),
                UpdatedAt   = existing?.UpdatedAt ?? existing?.CreatedAt,
            };
        }).ToList();

        return Ok(result);
    }

    // PUT /api/message-templates/{kind}
    [HttpPut("{kind}")]
    public async Task<ActionResult<MessageTemplateResponseDto>> Upsert(string kind, [FromBody] UpsertMessageTemplateDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Clínica não identificada." });

        var normalized = kind.ToUpperInvariant();
        if (!KindDefaults.ContainsKey(normalized))
            return BadRequest(new { message = $"Tipo de template inválido: {kind}" });

        if (string.IsNullOrWhiteSpace(dto.Body))
            return BadRequest(new { message = "Conteúdo do template é obrigatório." });

        var existing = await _db.MessageTemplates
            .FirstOrDefaultAsync(t => t.ClinicId == clinicId && t.Kind == normalized);

        if (existing == null)
        {
            existing = new MessageTemplate
            {
                Id        = Guid.NewGuid(),
                ClinicId  = clinicId,
                Kind      = normalized,
                Body      = dto.Body.Trim(),
                CreatedAt = DateTime.UtcNow,
            };
            _db.MessageTemplates.Add(existing);
        }
        else
        {
            existing.Body      = dto.Body.Trim();
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new MessageTemplateResponseDto
        {
            Kind      = existing.Kind,
            Body      = existing.Body,
            IsDefault = false,
            Variables = KindVariables.TryGetValue(existing.Kind, out var v) ? v : Array.Empty<string>(),
            UpdatedAt = existing.UpdatedAt ?? existing.CreatedAt,
        });
    }
}
