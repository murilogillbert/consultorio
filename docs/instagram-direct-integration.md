# Instagram Direct Integration

Canonical mode: `InstagramLogin`.

## Sender ID

For inbound Direct Messages, Meta sends the Instagram Scoped User ID (IGSID) in:

```json
entry[].messaging[].sender.id
```

That value is the only reliable identifier used by the system to create/link the patient and to send replies. `message_edit.mid` is not a reliable source for discovering the sender.

## Required Meta Setup

1. The app must be live, or the sender/tester must have the correct role on the Meta app and the Instagram professional account.
2. The Instagram professional account must grant `instagram_business_manage_messages`.
3. The callback URL must be verified in Meta Developers with the clinic verify token.
4. The professional account must be subscribed with `POST /{ig_user_id}/subscribed_apps`.
5. `messages` must be present in the subscribed fields returned by `GET /{ig_user_id}/subscribed_apps`.

## Endpoints Used In InstagramLogin Mode

```text
POST https://graph.instagram.com/v23.0/{ig_user_id}/messages
POST https://graph.instagram.com/v23.0/{ig_user_id}/subscribed_apps
GET  https://graph.instagram.com/v23.0/{ig_user_id}/subscribed_apps
GET  https://graph.instagram.com/v23.0/{ig_scoped_id}?fields=name,username
```

## message_edit Policy

`message` events are the primary source of inbound DMs.

If a `message_edit` event arrives without `sender.id`, the webhook logs diagnostics and does not import it. A legacy fallback that tries to query message data by `mid` can be enabled with:

```json
"Instagram": {
  "AllowMessageEditMidFallback": "true"
}
```

Keep this disabled unless you are debugging a specific Meta delivery issue.
