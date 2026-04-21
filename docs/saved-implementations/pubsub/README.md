# Gmail Pub/Sub — Implementação Preservada

Extraído do commit `04a859c` (Implement Gmail Pub/Sub realtime sync).
Guardado em 2026-04-20 para implementação futura controlada.

## Arquivos salvos

| Arquivo | Descrição |
|---------|-----------|
| `GmailPubSubService.cs` | Serviço principal: autenticação service account via JWT, criação de subscription, watch/unwatch do Gmail |
| `GmailWatchRenewalService.cs` | BackgroundService que renova o watch a cada 12h |
| `GmailWebhooksController.cs` | Endpoint `POST /api/webhooks/gmail` que recebe notificações Pub/Sub |
| `20260419235900_AddClinicGmailPubSubFields.cs` | Migration EF Core que adiciona os campos de Pub/Sub ao modelo Clinic |

## Campos que precisarão ser adicionados ao Clinic

```csharp
public string? GmailAddress { get; set; }
public string? GmailWatchHistoryId { get; set; }
public string? PubsubProjectId { get; set; }
public string? PubsubTopicName { get; set; }
public string? PubsubServiceAccount { get; set; }
public string? PubsubVerificationToken { get; set; }
public string? PubsubSubscriptionName { get; set; }
public string? PubsubPushEndpoint { get; set; }
public DateTime? PubsubWatchExpiresAt { get; set; }
```

## Pontos de atenção para a próxima implementação

1. Fazer em commits separados: migration → service → controller → frontend
2. Não modificar `GoogleOAuthService.cs` se possível — apenas usar seus métodos existentes
3. Testar localmente com `dotnet build` antes de qualquer push
