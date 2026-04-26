# Integração Instagram Direct (DMs)

## Modo canônico

A integração tem dois modos. O backend usa um único modo configurado em
`appsettings.json` (`Instagram:Mode`), e a UI mostra qual está ativo.

| Modo                | Base URL                  | Owner da chamada           | Quando usar                    |
| ------------------- | ------------------------- | -------------------------- | ------------------------------ |
| `InstagramLogin`    | `https://graph.instagram.com` | Instagram Business Account ID | Padrão para apps novos (recomendado pela Meta) |
| `FacebookPageLogin` | `https://graph.facebook.com`  | Facebook Page ID              | Fluxo legado / apps existentes |

`Instagram:Mode` aceita `InstagramLogin` (default) ou `FacebookPageLogin`.

## Endpoints efetivos

Pela abstração `MetaInstagramMessagingClient`, todos os endpoints saem
de URL builders centralizados:

- **Send**: `POST {base}/{version}/{owner_id}/messages`
- **Subscribe**: `POST {base}/{version}/{owner_id}/subscribed_apps?subscribed_fields=...`
- **Confirm**: `GET  {base}/{version}/{owner_id}/subscribed_apps`
- **Account probe**: `GET {base}/{version}/{owner_id}?fields=...`

Esses endpoints **não** são URLs para cadastrar no painel da Meta. Eles são
chamadas internas do backend. No Meta Developers, a URL que precisa ser
cadastrada é somente o webhook público do sistema.

No modo `InstagramLogin`, se o `Instagram Business Account ID` ainda não foi
salvo, o teste de conexão usa `GET https://graph.instagram.com/{version}/me`
para descobrir o `ig_user_id` a partir do Instagram Access Token e então
passa a montar `/{ig_user_id}/messages` e `/{ig_user_id}/subscribed_apps`.

No envio, o `recipient.id` é sempre o IGSID do paciente (`Patient.IgUserId`).

## Webhook — semântica dos eventos

A regra é: `message` é a fonte primária de novas DMs.

- **`message`** com `sender.id` + `text`/`attachments` → importa.
- **`message` com `is_echo: true`** → mensagem outbound da própria conta, ignora.
- **`message_edit` com `num_edit > 0`** → edição de mensagem existente, ignora.
- **`message_edit` com `num_edit = 0`**:
  - se vier com `sender.id` + `text` inline → importa.
  - se vier sem → **apenas diagnóstico**, NÃO importa nem busca via Graph
    (a menos que `Instagram:EnableMidFallbackLookup=true`).
- **`read`, `delivery`, `postback`, `reaction`** → loga e ignora.

### Por que `message_edit` virou diagnóstico

A Meta envia um `message_edit (num_edit=0)` para toda DM nova depois que o
recurso de edição foi lançado, mas a mensagem real chega como `message`
quando o webhook do Page/Messenger está ativo com o campo `messages`
subscrito. Importar pelo `message_edit` mascara um problema real de
configuração — preferimos logar o sintoma e direcionar a correção para a
inscrição correta.

### Fallback de busca por `mid`

`Instagram:EnableMidFallbackLookup` (default `false`) ativa a tentativa de
recuperar conteúdo/sender via `GET /{mid}` quando o `message_edit` chega
incompleto. É só fallback observável — se você precisar dele rotineiramente,
o problema está na subscrição.

## Logs estruturados

Cada evento é renderizado uma vez com `[IG-DIAG]`:

```
[IG-DIAG] (messaging[]) object=instagram entry=17841... kind=message
hasSender=true hasRecipient=true hasMessage=true hasMessageEdit=false
hasText=true hasAttachments=false isEcho=false numEdit=- mid=mid_abc...
sender=178420... recipient=178410...
```

Nenhum log inclui access token. O HMAC só aparece em prefixo curto
(primeiros 12 caracteres) durante diagnóstico de assinatura.

## Checklist de validação no Meta Developers

Sem esses passos a Meta não envia mensagem nenhuma para o webhook:

1. **App publicado** (Live mode) **OU** o usuário do teste tem papel no app
   (Admin/Developer/Tester) **e** na conta profissional Instagram conectada.
2. **Permissões aprovadas** no app:
   - `instagram_business_basic`
   - `instagram_business_manage_messages`
   - (legado FacebookPageLogin) `pages_messaging`, `pages_show_list`,
     `pages_manage_metadata`, `instagram_manage_messages`,
     `instagram_basic`.
3. **Webhook do app** configurado:
   - URL verificada (`GET /api/webhooks/instagram` retorna o `hub.challenge`).
   - Verify token salvo na clínica corresponde ao painel.
   - Campo **`messages`** marcado.
4. **Conta profissional subscrita ao app**:
   - `POST /{owner_id}/subscribed_apps?subscribed_fields=messages,...`
   - Confirme com `GET /{owner_id}/subscribed_apps` — a resposta deve listar
     o app com `subscribed_fields` incluindo `messages`.
5. **Conexão Instagram ↔ Facebook** (somente FacebookPageLogin):
   conta profissional Instagram precisa estar vinculada à Page no Meta
   Business Suite.
6. **App Secret**: salvo em `IgAppSecret` da clínica (ou fallback em
   `WaAppSecret`). Sem ele o webhook entra em modo bypass de HMAC e
   loga warning.

## Como diagnosticar quando algo não chega

1. Ative `LogLevel:Default=Information` e olhe `[IG-DIAG]` — confirma se a
   Meta está chegando com `kind=message`.
2. Confirme `subscribed_apps` no painel ou via API. Se `fields` não inclui
   `messages`, o webhook nunca recebe DMs.
3. Verifique `[IG-WEBHOOK] Match clínica ...` — se está dizendo
   "Nenhuma clínica corresponde", o `IgAccountId`/`IgPageId` salvo difere
   do `entry.id` que a Meta envia. Salve o valor visto no log.
4. Se só chegam `message_edit`, é quase sempre o webhook do Messenger
   `messages` não subscrito. Re-faça o passo 4 do checklist.
