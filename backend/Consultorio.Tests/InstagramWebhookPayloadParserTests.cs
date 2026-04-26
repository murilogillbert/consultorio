using System.Text.Json;
using Consultorio.API.Services;
using Xunit;

namespace Consultorio.Tests;

public class InstagramWebhookPayloadParserTests
{
    private static JsonElement LoadMessaging(string fixtureName)
    {
        var path = Path.Combine("Fixtures", fixtureName);
        var root = JsonDocument.Parse(File.ReadAllText(path)).RootElement;
        return root
            .GetProperty("entry")[0]
            .GetProperty("messaging")[0];
    }

    private static string EntryId(string fixtureName)
    {
        var path = Path.Combine("Fixtures", fixtureName);
        var root = JsonDocument.Parse(File.ReadAllText(path)).RootElement;
        return root.GetProperty("entry")[0].GetProperty("id").GetString()!;
    }

    // ── message (DM primária) ────────────────────────────────────────────────

    [Fact]
    public void Message_StandardDm_KindIsMessage()
    {
        var diag = Diagnose("message.json");

        Assert.Equal("message", diag.EventKind);
        Assert.True(diag.HasMessage);
        Assert.False(diag.HasMessageEdit);
        Assert.False(diag.IsEcho);
    }

    [Fact]
    public void Message_StandardDm_HasSenderAndRecipient()
    {
        var diag = Diagnose("message.json");

        Assert.True(diag.HasSender);
        Assert.True(diag.HasRecipient);
        Assert.Equal("17842000000000001", diag.SenderId);
        Assert.Equal("17841400000000000", diag.RecipientId);
    }

    [Fact]
    public void Message_StandardDm_HasTextAndMid()
    {
        var diag = Diagnose("message.json");

        Assert.True(diag.HasText);
        Assert.False(diag.HasAttachments);
        Assert.Equal("aWdfZG1fdGVzdF9taWRfb25l", diag.Mid);
    }

    // ── message_edit completo (num_edit=0, sender+text inline) ──────────────

    [Fact]
    public void MessageEditComplete_KindIsMessageEdit()
    {
        var diag = Diagnose("message_edit_complete.json");

        Assert.Equal("message_edit", diag.EventKind);
        Assert.True(diag.HasMessageEdit);
        Assert.False(diag.HasMessage);
    }

    [Fact]
    public void MessageEditComplete_NumEditIsZero()
    {
        var diag = Diagnose("message_edit_complete.json");

        Assert.Equal(0, diag.NumEdit);
    }

    [Fact]
    public void MessageEditComplete_HasSenderAndText()
    {
        var diag = Diagnose("message_edit_complete.json");

        Assert.True(diag.HasSender);
        Assert.True(diag.HasText);
        Assert.Equal("17842000000000001", diag.SenderId);
    }

    // ── message_edit incompleto (num_edit=0, sem sender/text) ───────────────

    [Fact]
    public void MessageEditIncomplete_KindIsMessageEdit()
    {
        var diag = Diagnose("message_edit_incomplete.json");

        Assert.Equal("message_edit", diag.EventKind);
        Assert.Equal(0, diag.NumEdit);
    }

    [Fact]
    public void MessageEditIncomplete_NoSenderNoText()
    {
        var diag = Diagnose("message_edit_incomplete.json");

        Assert.False(diag.HasSender);
        Assert.False(diag.HasText);
        Assert.Null(diag.SenderId);
    }

    // ── message_edit real (num_edit > 0) — deve ser ignorado pelo controller

    [Fact]
    public void MessageEditReal_NumEditGreaterThanZero()
    {
        var diag = Diagnose("message_edit_real.json");

        Assert.Equal("message_edit", diag.EventKind);
        Assert.True(diag.NumEdit > 0);
    }

    // ── echo ─────────────────────────────────────────────────────────────────

    [Fact]
    public void Echo_KindIsEcho()
    {
        var diag = Diagnose("echo.json");

        Assert.Equal("echo", diag.EventKind);
        Assert.True(diag.IsEcho);
        Assert.True(diag.HasMessage);
    }

    [Fact]
    public void Echo_HasSenderAndText()
    {
        var diag = Diagnose("echo.json");

        Assert.True(diag.HasSender);
        Assert.True(diag.HasText);
    }

    // ── read ─────────────────────────────────────────────────────────────────

    [Fact]
    public void Read_KindIsRead()
    {
        var diag = Diagnose("read.json");

        Assert.Equal("read", diag.EventKind);
        Assert.False(diag.HasMessage);
        Assert.False(diag.HasMessageEdit);
    }

    [Fact]
    public void Read_HasSenderAndRecipient()
    {
        var diag = Diagnose("read.json");

        Assert.True(diag.HasSender);
        Assert.True(diag.HasRecipient);
    }

    // ── postback ─────────────────────────────────────────────────────────────

    [Fact]
    public void Postback_KindIsPostback()
    {
        var diag = Diagnose("postback.json");

        Assert.Equal("postback", diag.EventKind);
        Assert.False(diag.HasMessage);
    }

    [Fact]
    public void Postback_HasSenderAndRecipient()
    {
        var diag = Diagnose("postback.json");

        Assert.True(diag.HasSender);
        Assert.True(diag.HasRecipient);
    }

    // ── Render (smoke test — sem token no output) ─────────────────────────────

    [Fact]
    public void Render_DoesNotContainToken()
    {
        var diag   = Diagnose("message.json");
        var output = InstagramWebhookPayloadParser.Render(diag);

        Assert.DoesNotContain("access_token", output, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("kind=message", output);
        Assert.Contains("hasSender=True", output);
    }

    [Fact]
    public void Render_ContainsEntryId()
    {
        var fixture = "message.json";
        var evt     = LoadMessaging(fixture);
        var id      = EntryId(fixture);
        var diag    = InstagramWebhookPayloadParser.Diagnose(evt, id, "instagram");
        var output  = InstagramWebhookPayloadParser.Render(diag);

        Assert.Contains(id, output);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static InstagramEventDiagnostics Diagnose(string fixtureName)
    {
        var evt     = LoadMessaging(fixtureName);
        var entryId = EntryId(fixtureName);
        return InstagramWebhookPayloadParser.Diagnose(evt, entryId, "instagram");
    }
}
