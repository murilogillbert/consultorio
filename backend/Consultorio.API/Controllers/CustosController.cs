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
public class CustosController : ControllerBase
{
    private readonly AppDbContext _db;

    public CustosController(AppDbContext db) => _db = db;

    private Guid GetClinicId()
    {
        return Guid.TryParse(User.FindFirst("clinicId")?.Value, out var clinicId)
            ? clinicId
            : Guid.Empty;
    }

    private static readonly HashSet<string> TiposValidos = new(StringComparer.OrdinalIgnoreCase) { "Fixo", "Variavel", "Variável" };
    private static readonly HashSet<string> RecorrenciasValidas = new(StringComparer.OrdinalIgnoreCase) { "Unico", "Único", "Mensal", "Anual" };
    private static readonly HashSet<string> StatusValidos = new(StringComparer.OrdinalIgnoreCase) { "Pago", "Pendente", "Previsto" };

    private static CustoResponseDto ToDto(Custo c) => new()
    {
        Id = c.Id,
        Nome = c.Nome,
        Categoria = c.Categoria,
        Valor = c.Valor,
        Tipo = c.Tipo,
        Recorrencia = c.Recorrencia,
        DataCompetencia = c.DataCompetencia,
        DataVencimento = c.DataVencimento,
        Status = c.Status,
        Observacoes = c.Observacoes,
        CriadoEm = c.CriadoEm,
        AtualizadoEm = c.AtualizadoEm
    };

    private static (DateTime start, DateTime end) ParsePeriod(string? period)
    {
        var now = DateTime.UtcNow;
        var end = now.Date.AddDays(1).AddSeconds(-1);
        DateTime start;
        switch (period)
        {
            case "Hoje": start = now.Date; break;
            case "7 dias": start = now.AddDays(-7); break;
            case "3 meses": start = now.AddDays(-90); break;
            case "12 meses": start = now.AddDays(-365); break;
            default: start = now.AddDays(-30); break;
        }
        return (start, end);
    }

    // GET /api/custos
    [HttpGet]
    public async Task<ActionResult<List<CustoResponseDto>>> GetAll(
        [FromQuery] string? period,
        [FromQuery] DateTime? start,
        [FromQuery] DateTime? end,
        [FromQuery] string? categoria,
        [FromQuery] string? status)
    {
        var clinicId = GetClinicId();
        var query = _db.Custos.Where(c => c.ClinicId == clinicId);

        if (start.HasValue && end.HasValue)
        {
            query = query.Where(c => c.DataCompetencia >= start.Value && c.DataCompetencia <= end.Value);
        }
        else if (!string.IsNullOrEmpty(period))
        {
            var (s, e) = ParsePeriod(period);
            query = query.Where(c => c.DataCompetencia >= s && c.DataCompetencia <= e);
        }

        if (!string.IsNullOrEmpty(categoria))
            query = query.Where(c => c.Categoria == categoria);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(c => c.Status == status);

        var custos = await query
            .OrderByDescending(c => c.DataCompetencia)
            .ToListAsync();

        return Ok(custos.Select(ToDto).ToList());
    }

    // GET /api/custos/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<CustoResponseDto>> GetById(Guid id)
    {
        var clinicId = GetClinicId();
        var custo = await _db.Custos.FirstOrDefaultAsync(c => c.Id == id && c.ClinicId == clinicId);
        if (custo == null) return NotFound(new { message = "Custo não encontrado." });
        return Ok(ToDto(custo));
    }

    // POST /api/custos
    [HttpPost]
    public async Task<ActionResult<CustoResponseDto>> Create([FromBody] CreateCustoDto dto)
    {
        var clinicId = GetClinicId();
        if (clinicId == Guid.Empty)
            return BadRequest(new { message = "Usuário não está vinculado a nenhuma clínica." });

        if (string.IsNullOrWhiteSpace(dto.Nome))
            return BadRequest(new { message = "Nome é obrigatório." });
        if (string.IsNullOrWhiteSpace(dto.Categoria))
            return BadRequest(new { message = "Categoria é obrigatória." });
        if (dto.Valor < 0)
            return BadRequest(new { message = "Valor deve ser positivo." });

        var tipo = string.IsNullOrWhiteSpace(dto.Tipo) ? "Fixo" : dto.Tipo!.Trim();
        if (!TiposValidos.Contains(tipo))
            return BadRequest(new { message = "Tipo inválido. Use Fixo ou Variável." });

        var recorrencia = string.IsNullOrWhiteSpace(dto.Recorrencia) ? "Mensal" : dto.Recorrencia!.Trim();
        if (!RecorrenciasValidas.Contains(recorrencia))
            return BadRequest(new { message = "Recorrência inválida. Use Único, Mensal ou Anual." });

        var status = string.IsNullOrWhiteSpace(dto.Status) ? "Pendente" : dto.Status!.Trim();
        if (!StatusValidos.Contains(status))
            return BadRequest(new { message = "Status inválido. Use Pago, Pendente ou Previsto." });

        var custo = new Custo
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Nome = dto.Nome.Trim(),
            Categoria = dto.Categoria.Trim(),
            Valor = dto.Valor,
            Tipo = tipo,
            Recorrencia = recorrencia,
            DataCompetencia = dto.DataCompetencia == default ? DateTime.UtcNow : dto.DataCompetencia,
            DataVencimento = dto.DataVencimento,
            Status = status,
            Observacoes = dto.Observacoes,
            CriadoEm = DateTime.UtcNow
        };

        _db.Custos.Add(custo);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = custo.Id }, ToDto(custo));
    }

    // PUT /api/custos/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<CustoResponseDto>> Update(Guid id, [FromBody] UpdateCustoDto dto)
    {
        var clinicId = GetClinicId();
        var custo = await _db.Custos.FirstOrDefaultAsync(c => c.Id == id && c.ClinicId == clinicId);
        if (custo == null) return NotFound(new { message = "Custo não encontrado." });

        if (dto.Nome != null)
        {
            if (string.IsNullOrWhiteSpace(dto.Nome))
                return BadRequest(new { message = "Nome não pode ser vazio." });
            custo.Nome = dto.Nome.Trim();
        }
        if (dto.Categoria != null)
        {
            if (string.IsNullOrWhiteSpace(dto.Categoria))
                return BadRequest(new { message = "Categoria não pode ser vazia." });
            custo.Categoria = dto.Categoria.Trim();
        }
        if (dto.Valor.HasValue)
        {
            if (dto.Valor.Value < 0)
                return BadRequest(new { message = "Valor deve ser positivo." });
            custo.Valor = dto.Valor.Value;
        }
        if (dto.Tipo != null)
        {
            if (!TiposValidos.Contains(dto.Tipo))
                return BadRequest(new { message = "Tipo inválido." });
            custo.Tipo = dto.Tipo;
        }
        if (dto.Recorrencia != null)
        {
            if (!RecorrenciasValidas.Contains(dto.Recorrencia))
                return BadRequest(new { message = "Recorrência inválida." });
            custo.Recorrencia = dto.Recorrencia;
        }
        if (dto.Status != null)
        {
            if (!StatusValidos.Contains(dto.Status))
                return BadRequest(new { message = "Status inválido." });
            custo.Status = dto.Status;
        }
        if (dto.DataCompetencia.HasValue) custo.DataCompetencia = dto.DataCompetencia.Value;
        if (dto.DataVencimento.HasValue) custo.DataVencimento = dto.DataVencimento;
        if (dto.Observacoes != null) custo.Observacoes = dto.Observacoes;

        custo.AtualizadoEm = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(custo));
    }

    // DELETE /api/custos/{id}
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var clinicId = GetClinicId();
        var custo = await _db.Custos.FirstOrDefaultAsync(c => c.Id == id && c.ClinicId == clinicId);
        if (custo == null) return NotFound(new { message = "Custo não encontrado." });
        _db.Custos.Remove(custo);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
