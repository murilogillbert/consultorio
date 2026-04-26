using System.Text.Json;

namespace Consultorio.API.Services;

/// <summary>
/// Estado bruto extraído de um payload do webhook do Instagram. Mantido
/// como struct imutável e sem efeitos colaterais — o controller usa pra
/// decidir o que fazer (importar, ignorar ou apenas logar como diagnóstico).
/// </summary>
public class InstagramEventDiagnostics
{
    public string?  Object        { get; init; }
    public string?  EntryId       { get; init; }
    public bool     HasMessaging  { get; init; }
    public bool     HasChanges    { get; init; }
    public bool     HasSender     { get; init; }
    public bool     HasRecipient  { get; init; }
    public bool     HasMessage    { get; init; }
    public bool     HasMessageEdit{ get; init; }
    public bool     HasText       { get; init; }
    public bool     HasAttachments{ get; init; }
    public bool     IsEcho        { get; init; }
    public int?     NumEdit       { get; init; }
    public string?  Mid           { get; init; }
    public string?  SenderId      { get; init; }
    public string?  RecipientId   { get; init; }
    public long?    Timestamp     { get; init; }
    public string?  EventKind     { get; init; } // "message" | "message_edit" | "read" | "delivery" | "postback" | "reaction" | "unknown"
}

public static class InstagramWebhookPayloadParser
{
    /// <summary>
    /// Lê um único evento (entry.messaging[i] ou entry.changes[i].value)
    /// e devolve diagnósticos estruturados, sem fazer chamada externa
    /// nem persistência.
    /// </summary>
    public static InstagramEventDiagnostics Diagnose(JsonElement evt, string? entryId = null, string? rootObject = null)
    {
        bool has(string n)         => evt.TryGetProperty(n, out _);
        bool hasObj(string n)      => evt.TryGetProperty(n, out var e) && e.ValueKind == JsonValueKind.Object;

        string? extractId(string property)
        {
            if (!evt.TryGetProperty(property, out var node) || node.ValueKind != JsonValueKind.Object)
                return null;
            return node.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
        }

        var hasMessage      = hasObj("message");
        var hasMessageEdit  = hasObj("message_edit");
        var hasReaction     = hasObj("reaction");
        var hasPostback     = hasObj("postback");
        var hasRead         = hasObj("read");
        var hasDelivery     = hasObj("delivery");

        string? mid       = null;
        string? text      = null;
        bool   hasAttach  = false;
        bool   isEcho     = false;
        int?   numEdit    = null;

        if (hasMessage)
        {
            var m = evt.GetProperty("message");
            mid       = m.TryGetProperty("mid",         out var mEl)  ? mEl.GetString() : null;
            text      = m.TryGetProperty("text",        out var tEl)  ? tEl.GetString() : null;
            hasAttach = m.TryGetProperty("attachments", out var aEl)  && aEl.ValueKind == JsonValueKind.Array && aEl.GetArrayLength() > 0;
            isEcho    = m.TryGetProperty("is_echo",     out var eEl)  && eEl.ValueKind == JsonValueKind.True;
        }
        else if (hasMessageEdit)
        {
            var ed = evt.GetProperty("message_edit");
            mid     = ed.TryGetProperty("mid",      out var mEl) ? mEl.GetString() : null;
            text    = ed.TryGetProperty("text",     out var tEl) ? tEl.GetString() : null;
            numEdit = ed.TryGetProperty("num_edit", out var nEl) && nEl.ValueKind == JsonValueKind.Number
                ? nEl.GetInt32() : (int?)null;
        }

        var senderId    = extractId("sender");
        var recipientId = extractId("recipient");

        long? ts = null;
        if (evt.TryGetProperty("timestamp", out var tsEl))
        {
            if (tsEl.ValueKind == JsonValueKind.Number && tsEl.TryGetInt64(out var v)) ts = v;
            else if (tsEl.ValueKind == JsonValueKind.String && long.TryParse(tsEl.GetString(), out var sv)) ts = sv;
        }

        string kind =
            hasMessage     ? (isEcho ? "echo" : "message") :
            hasMessageEdit ? "message_edit" :
            hasReaction    ? "reaction" :
            hasPostback    ? "postback" :
            hasRead        ? "read" :
            hasDelivery    ? "delivery" :
            "unknown";

        return new InstagramEventDiagnostics
        {
            Object         = rootObject,
            EntryId        = entryId,
            HasMessaging   = false, // preenchido no nível de entry pelo caller
            HasChanges     = false,
            HasSender      = !string.IsNullOrWhiteSpace(senderId),
            HasRecipient   = !string.IsNullOrWhiteSpace(recipientId),
            HasMessage     = hasMessage,
            HasMessageEdit = hasMessageEdit,
            HasText        = !string.IsNullOrWhiteSpace(text),
            HasAttachments = hasAttach,
            IsEcho         = isEcho,
            NumEdit        = numEdit,
            Mid            = mid,
            SenderId       = senderId,
            RecipientId    = recipientId,
            Timestamp      = ts,
            EventKind      = kind,
        };
    }

    /// <summary>
    /// Renderiza um diagnóstico em formato compacto/legível para log,
    /// sem nunca incluir tokens. Útil pra grep e métricas.
    /// </summary>
    public static string Render(InstagramEventDiagnostics d) =>
        $"object={d.Object ?? "(null)"} entry={d.EntryId ?? "(null)"} kind={d.EventKind} " +
        $"hasSender={d.HasSender} hasRecipient={d.HasRecipient} hasMessage={d.HasMessage} " +
        $"hasMessageEdit={d.HasMessageEdit} hasText={d.HasText} hasAttachments={d.HasAttachments} " +
        $"isEcho={d.IsEcho} numEdit={(d.NumEdit?.ToString() ?? "-")} mid={(d.Mid ?? "(null)")} " +
        $"sender={(d.SenderId ?? "(null)")} recipient={(d.RecipientId ?? "(null)")}";
}
