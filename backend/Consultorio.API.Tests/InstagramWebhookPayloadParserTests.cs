using System.Text.Json;
using Consultorio.API.Services;
using Xunit;

namespace Consultorio.API.Tests;

public class InstagramWebhookPayloadParserTests
{
    [Fact]
    public void ExtractMessageEvents_ReadsSenderIdFromMessagingPayload()
    {
        using var doc = JsonDocument.Parse("""
        {
          "object": "instagram",
          "entry": [
            {
              "id": "17841433989365793",
              "time": 1762785320962,
              "messaging": [
                {
                  "sender": { "id": "1234567890" },
                  "recipient": { "id": "17841433989365793" },
                  "timestamp": 1762785320762,
                  "message": {
                    "mid": "mid-message-1",
                    "text": "Oi"
                  }
                }
              ]
            }
          ]
        }
        """);

        var events = InstagramWebhookPayloadParser.ExtractMessageEvents(doc.RootElement);

        Assert.Single(events);
        var diagnostics = events[0].Diagnostics;
        Assert.True(diagnostics.HasMessage);
        Assert.True(diagnostics.HasSender);
        Assert.Equal("1234567890", diagnostics.SenderId);
        Assert.Equal("mid-message-1", diagnostics.MessageId);
        Assert.True(diagnostics.HasText);
    }

    [Fact]
    public void ExtractMessageEvents_DiagnosesIncompleteMessageEdit()
    {
        using var doc = JsonDocument.Parse("""
        {
          "object": "instagram",
          "entry": [
            {
              "id": "17841433989365793",
              "time": 1762785320962,
              "messaging": [
                {
                  "timestamp": 1762785320762,
                  "message_edit": {
                    "mid": "mid-edit-1",
                    "num_edit": 0
                  }
                }
              ]
            }
          ]
        }
        """);

        var events = InstagramWebhookPayloadParser.ExtractMessageEvents(doc.RootElement);

        Assert.Single(events);
        var diagnostics = events[0].Diagnostics;
        Assert.False(diagnostics.HasMessage);
        Assert.True(diagnostics.HasMessageEdit);
        Assert.False(diagnostics.HasSender);
        Assert.False(diagnostics.HasText);
        Assert.Equal(0, diagnostics.NumEdit);
        Assert.Equal("mid-edit-1", diagnostics.MessageId);
    }

    [Fact]
    public void ExtractMessageEvents_ReadsChangesPayload()
    {
        using var doc = JsonDocument.Parse("""
        {
          "object": "instagram",
          "entry": [
            {
              "id": "17841433989365793",
              "changes": [
                {
                  "field": "messages",
                  "value": {
                    "sender": { "id": "998877" },
                    "recipient": { "id": "17841433989365793" },
                    "timestamp": "1527459824",
                    "message": {
                      "mid": "mid-change-1",
                      "text": "Hello"
                    }
                  }
                }
              ]
            }
          ]
        }
        """);

        var events = InstagramWebhookPayloadParser.ExtractMessageEvents(doc.RootElement);

        Assert.Single(events);
        Assert.Equal("messages", events[0].Diagnostics.Field);
        Assert.Equal("998877", events[0].Diagnostics.SenderId);
        Assert.True(events[0].Diagnostics.HasMessage);
    }
}
