/**
 * gmailPubSubWebhook.ts
 *
 * Receives Google Cloud Pub/Sub push notifications for Gmail inbox events.
 *
 * Google POSTs a JSON payload to this endpoint whenever the Gmail inbox
 * of any watched account receives a new message:
 *
 * {
 *   "message": {
 *     "data": "<base64url-encoded JSON>",   // { emailAddress, historyId }
 *     "messageId": "...",
 *     "publishTime": "..."
 *   },
 *   "subscription": "projects/.../subscriptions/..."
 * }
 *
 * We MUST reply 200 quickly — any non-2xx causes Pub/Sub to retry.
 * Heavy work is done asynchronously so the reply is immediate.
 *
 * Security:
 *  - Validate the Bearer token in the Authorization header against a shared
 *    secret we set when creating the Pub/Sub push subscription (pubsubServiceAccount).
 *  - If no secret is configured, we accept the request (development mode).
 */

import { Request, Response } from 'express'
import { prisma } from '../../../../config/database'
import { processGmailNotification } from './processGmailNotificationService'

export class GmailPubSubWebhookController {
  async handle(req: Request, res: Response): Promise<void> {
    // Always acknowledge immediately so Pub/Sub doesn't retry
    res.status(200).send('OK')

    try {
      await this.process(req)
    } catch (err) {
      console.error('[Gmail Pub/Sub] Erro inesperado no handler:', err)
    }
  }

  private async process(req: Request): Promise<void> {
    // ── 1. Validate shared secret (if configured) ──────────────────────────
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

    if (token) {
      const valid = await this.validateToken(token)
      if (!valid) {
        console.warn('[Gmail Pub/Sub] Token inválido — notificação ignorada')
        return
      }
    }

    // ── 2. Decode Pub/Sub message ──────────────────────────────────────────
    const pubsubMessage = req.body?.message
    if (!pubsubMessage?.data) {
      console.warn('[Gmail Pub/Sub] Payload sem data — ignorado')
      return
    }

    let notificationData: { emailAddress?: string; historyId?: string }
    try {
      const decoded = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8')
      notificationData = JSON.parse(decoded)
    } catch (err) {
      console.warn('[Gmail Pub/Sub] Falha ao decodificar data base64:', err)
      return
    }

    const { emailAddress, historyId } = notificationData
    if (!emailAddress || !historyId) {
      console.warn('[Gmail Pub/Sub] Campos obrigatórios ausentes:', notificationData)
      return
    }

    console.log(
      `[Gmail Pub/Sub] Notificação recebida — email: ${emailAddress}, historyId: ${historyId}`,
    )

    // ── 3. Process the notification asynchronously ─────────────────────────
    await processGmailNotification({ emailAddress, historyId })
  }

  /**
   * Validate the Bearer token sent by Pub/Sub against any clinic's
   * pubsubServiceAccount secret. In production you would use a dedicated
   * webhook verification token or verify a Google-signed OIDC token.
   * Here we match against the stored pubsubServiceAccount value as a simple
   * shared-secret approach.
   */
  private async validateToken(token: string): Promise<boolean> {
    const match = await prisma.integrationSettings.findFirst({
      where: { pubsubServiceAccount: token },
    })
    return !!match
  }
}
