namespace Consultorio.Domain.Models;

public class Custo
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }

    public string Nome { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public decimal Valor { get; set; }

    // "Fixo" | "Variavel"
    public string Tipo { get; set; } = "Fixo";

    // "Unico" | "Mensal" | "Anual"
    public string Recorrencia { get; set; } = "Mensal";

    public DateTime DataCompetencia { get; set; }
    public DateTime? DataVencimento { get; set; }

    // "Pago" | "Pendente" | "Previsto"
    public string Status { get; set; } = "Pendente";

    public string? Observacoes { get; set; }

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? AtualizadoEm { get; set; }

    public Clinic Clinic { get; set; } = null!;
}
