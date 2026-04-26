namespace Consultorio.API.DTOs;

public class CreateCustoDto
{
    public string Nome { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public string? Tipo { get; set; }
    public string? Recorrencia { get; set; }
    public DateTime DataCompetencia { get; set; }
    public DateTime? DataVencimento { get; set; }
    public string? Status { get; set; }
    public string? Observacoes { get; set; }
}

public class UpdateCustoDto
{
    public string? Nome { get; set; }
    public string? Categoria { get; set; }
    public decimal? Valor { get; set; }
    public string? Tipo { get; set; }
    public string? Recorrencia { get; set; }
    public DateTime? DataCompetencia { get; set; }
    public DateTime? DataVencimento { get; set; }
    public string? Status { get; set; }
    public string? Observacoes { get; set; }
}

public class CustoResponseDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public string Tipo { get; set; } = "Fixo";
    public string Recorrencia { get; set; } = "Mensal";
    public DateTime DataCompetencia { get; set; }
    public DateTime? DataVencimento { get; set; }
    public string Status { get; set; } = "Pendente";
    public string? Observacoes { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime? AtualizadoEm { get; set; }
}
