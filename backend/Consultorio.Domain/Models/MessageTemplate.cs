namespace Consultorio.Domain.Models;

/// <summary>
/// Template de mensagem por clínica. Cada clínica pode ter no máximo um
/// template de cada `Kind` (CONFIRMATION, REMINDER, POST_APPOINTMENT, BIRTHDAY).
///
/// O <see cref="Body"/> aceita os placeholders {nome}, {servico}, {data},
/// {hora}, {profissional} que são resolvidos no momento do envio com base no
/// paciente e no agendamento associado.
/// </summary>
public class MessageTemplate
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }

    /// <summary>CONFIRMATION | REMINDER | POST_APPOINTMENT | BIRTHDAY</summary>
    public string Kind { get; set; } = null!;

    public string Body { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Clinic Clinic { get; set; } = null!;
}
