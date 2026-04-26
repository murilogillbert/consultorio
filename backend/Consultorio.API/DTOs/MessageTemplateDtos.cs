namespace Consultorio.API.DTOs;

public class MessageTemplateResponseDto
{
    public string Kind { get; set; } = null!;
    public string Body { get; set; } = null!;
    /// <summary>True quando o template ainda não foi customizado pela clínica.</summary>
    public bool IsDefault { get; set; }
    public string[] Variables { get; set; } = Array.Empty<string>();
    public DateTime? UpdatedAt { get; set; }
}

public class UpsertMessageTemplateDto
{
    public string Body { get; set; } = null!;
}

public class SendTemplateMessageDto
{
    /// <summary>CONFIRMATION | REMINDER | POST_APPOINTMENT | BIRTHDAY</summary>
    public string Kind { get; set; } = null!;
    /// <summary>
    /// Opcional. Se omitido, o sistema usa o próximo agendamento (futuro mais
    /// próximo) do paciente; se não houver, usa o último realizado.
    /// </summary>
    public Guid? AppointmentId { get; set; }
}

public class TemplatePreviewDto
{
    public string Kind { get; set; } = null!;
    public string Body { get; set; } = null!;
    public string Rendered { get; set; } = null!;
}
