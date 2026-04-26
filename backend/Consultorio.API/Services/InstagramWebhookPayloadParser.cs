using System.Text.Json;

namespace Consultorio.API.Services;

public sealed record InstagramWebhookEventDiagnostics(
    string Object,
    string? EntryId,
    string? Field,
    bool HasSender,
    bool HasRecipient,
    bool HasMessage,
    bool HasMessageEdit,
    bool HasText,
    int? NumEdit,
    string? MessageId,
    string? SenderId,
    string? RecipientId);

public sealed record InstagramWebhookEventEnvelope(
    JsonElement Event,
    InstagramWebhookEventDiagnostics Diagnostics);

public static class InstagramWebhookPayloadParser
{
    public static IReadOnlyList<InstagramWebhookEventEnvelope> ExtractMessageEvents(JsonElement root)
    {
        var result = new List<InstagramWebhookEventEnvelope>();
        var objectName = root.TryGetProperty("object", out var objectEl)
            ? objectEl.GetString() ?? ""
            : "";

        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var entry in entries.EnumerateArray())
        {
            var entryId = entry.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;

            if (entry.TryGetProperty("messaging", out var messaging) && messaging.ValueKind == JsonValueKind.Array)
            {
                foreach (var event_ in messaging.EnumerateArray())
                    result.Add(new InstagramWebhookEventEnvelope(
                        event_,
                        BuildDiagnostics(objectName, entryId, "messaging", event_)));
            }

            if (entry.TryGetProperty("changes", out var changes) && changes.ValueKind == JsonValueKind.Array)
            {
                foreach (var change in changes.EnumerateArray())
                {
                    var field = change.TryGetProperty("field", out var fieldEl) ? fieldEl.GetString() : null;
                    if (!string.Equals(field, "messages", StringComparison.OrdinalIgnoreCase))
                        continue;

                    if (!change.TryGetProperty("value", out var value) || value.ValueKind != JsonValueKind.Object)
                        continue;

                    result.Add(new InstagramWebhookEventEnvelope(
                        value,
                        BuildDiagnostics(objectName, entryId, field, value)));
                }
            }
        }

        return result;
    }

    public static InstagramWebhookEventDiagnostics BuildDiagnostics(
        string objectName,
        string? entryId,
        string? field,
        JsonElement event_)
    {
        var senderId = ExtractNestedId(event_, "sender");
        var recipientId = ExtractNestedId(event_, "recipient");
        var hasMessage = event_.TryGetProperty("message", out var messageEl);
        var hasMessageEdit = event_.TryGetProperty("message_edit", out var editEl);

        string? messageId = null;
        var hasText = false;
        int? numEdit = null;

        if (hasMessage)
        {
            messageId = TryGetString(messageEl, "mid");
            hasText = messageEl.TryGetProperty("text", out var textEl) &&
                      !string.IsNullOrWhiteSpace(textEl.GetString());
        }

        if (hasMessageEdit)
        {
            messageId ??= TryGetString(editEl, "mid");
            hasText = editEl.TryGetProperty("text", out var editTextEl) &&
                      !string.IsNullOrWhiteSpace(editTextEl.GetString());

            if (editEl.TryGetProperty("num_edit", out var numEl) &&
                numEl.ValueKind == JsonValueKind.Number &&
                numEl.TryGetInt32(out var parsed))
            {
                numEdit = parsed;
            }
        }

        return new InstagramWebhookEventDiagnostics(
            objectName,
            entryId,
            field,
            !string.IsNullOrWhiteSpace(senderId),
            !string.IsNullOrWhiteSpace(recipientId),
            hasMessage,
            hasMessageEdit,
            hasText,
            numEdit,
            messageId,
            senderId,
            recipientId);
    }

    private static string? ExtractNestedId(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value))
            return null;

        if (value.ValueKind == JsonValueKind.Object &&
            value.TryGetProperty("id", out var idEl))
            return idEl.GetString();

        return value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    }

    private static string? TryGetString(JsonElement root, string propertyName) =>
        root.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
