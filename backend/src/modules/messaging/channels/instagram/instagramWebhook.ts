/**
 * instagramWebhook.ts
 *
 * Handles incoming Instagram Direct Message webhook events from Meta.
 *
 * Flow:
 *  1. GET  /webhooks/instagram  → verify webhook subscription (hub.challenge)
 *  2. POST /webhooks/instagram  → receive new DMs
 *  3. Find the clinic by matching igPageId to the recipient's Page ID
 *  4. Upsert Contact → upsert Conversation (INSTAGRAM channel) → create ExternalMessage
 *  5. Emit Socket.io event so the frontend updates in real time
 *
 * Meta Docs: https://developers.facebook.com/docs/messenger-platform/instagram/features/customer-chat
 */

import { Request, Response } from 'express'
import { prisma } from '../../../../config/database'
import { emitToClinic } from '../../../../shared/websocket/socketServer'

export class InstagramWebhookController {
  /**
   * GET /webhooks/instagram
   * Meta calls this once to verify the webhook endpoint.
   */
  async verify(req: Request, res: Response) {
    const mode = typeof req.query['hub.mode'] === 'string' ? req.query['hub.mode'] : undefined
    const token = typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'] : undefined
    const challenge = req.query['hub.challenge']

    if (mode !== 'subscribe' || !token) {
      console.error('[Instagram Webhook] Parâmetros de verificação ausentes')
      return res.status(400).send('Bad Request')
    }

    // Look up the clinic whose Instagram verify token matches
    const settings = await prisma.integrationSettings.findFirst({
      where: { igConnected: true },
    })

    // Use the igAccessToken as verify token (or fall back to env var)
    const envVerifyToken = process.env.IG_VERIFY_TOKEN
    const validToken =
      (envVerifyToken && token === envVerifyToken) ||
      (settings?.igPageId && token === settings.igPageId)

    if (validToken) {
      console.log('[Instagram Webhook] Verificação bem-sucedida')
      return res.status(200).send(challenge)
    }

    console.error('[Instagram Webhook] Falha na verificação: token inválido')
    return res.status(403).send('Forbidden')
  }

  /**
   * POST /webhooks/instagram
   * Called by Meta for every new DM (and other events we subscribed to).
   * Always returns 200 immediately (Meta requires this).
   */
  async handle(req: Request, res: Response) {
    // Always respond 200 immediately so Meta doesn't retry
    res.status(200).send('OK')

    try {
      const body = req.body
      if (body.object !== 'instagram') return

      for (const entry of body.entry ?? []) {
        const pageId = entry.id as string
        for (const event of entry.messaging ?? []) {
          if (event.message && !event.message.is_echo) {
            await this.handleIncomingMessage(pageId, event).catch((err) =>
              console.error('[Instagram Webhook] Erro ao processar mensagem:', err),
            )
          }
        }
      }
    } catch (err) {
      console.error('[Instagram Webhook] Erro inesperado:', err)
    }
  }

  private async handleIncomingMessage(
    pageId: string,
    event: {
      sender: { id: string }
      recipient: { id: string }
      timestamp: number
      message: { mid: string; text?: string; attachments?: any[] }
    },
  ) {
    const senderIgsid = event.sender.id
    const messageId = event.message.mid
    const text = event.message.text ?? ''
    const timestamp = new Date(event.timestamp)

    // Skip if already processed
    const exists = await prisma.externalMessage.count({
      where: { channelMessageId: messageId },
    })
    if (exists > 0) {
      console.log(`[Instagram Webhook] Mensagem ${messageId} já processada, ignorada.`)
      return
    }

    // Find the clinic whose Facebook Page ID matches
    const settings = await prisma.integrationSettings.findFirst({
      where: { igPageId: pageId },
    })

    const clinicId = settings?.clinicId
      ?? (await prisma.clinic.findFirst().then(c => c?.id))

    if (!clinicId) {
      console.warn('[Instagram Webhook] Nenhuma clínica encontrada para a Page ID:', pageId)
      return
    }

    // Upsert Contact by Instagram sender ID
    let contact = await prisma.contact.findFirst({
      where: { clinicId, instagramId: senderIgsid },
    })

    if (!contact) {
      // Try to fetch the sender's name via Graph API (best-effort)
      const senderName = await fetchInstagramUserName(senderIgsid, settings?.igAccessToken).catch(() => null)

      contact = await prisma.contact.create({
        data: {
          clinicId,
          instagramId: senderIgsid,
          name: senderName ?? null,
        },
      })
      console.log(`[Instagram Webhook] Novo contato criado: ${contact.id} (IGSID: ${senderIgsid})`)
    }

    // Find or create open Conversation for this contact on the INSTAGRAM channel
    let conversation = await prisma.conversation.findFirst({
      where: {
        clinicId,
        contactId: contact.id,
        channel: 'INSTAGRAM',
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          clinicId,
          contactId: contact.id,
          channel: 'INSTAGRAM',
          status: 'OPEN',
          unreadCount: 0,
        },
      })
      console.log(`[Instagram Webhook] Nova conversa criada: ${conversation.id}`)
    }

    // Determine content type
    let type = 'TEXT'
    let content: string | null = text || null
    if (!text && event.message.attachments?.length) {
      const att = event.message.attachments[0]
      type = (att.type as string)?.toUpperCase() ?? 'MEDIA'
      content = att.payload?.url ?? null
    }

    const savedMessage = await prisma.externalMessage.create({
      data: {
        conversationId: conversation.id,
        channelMessageId: messageId,
        direction: 'IN',
        type,
        content,
        metadata: JSON.stringify({
          senderIgsid,
          pageId,
          timestamp: event.timestamp,
        }),
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: timestamp,
        unreadCount: { increment: 1 },
      },
    })

    // Emit real-time event
    emitToClinic(clinicId, 'messaging:new_message', {
      conversationId: conversation.id,
      message: savedMessage,
      contact: {
        id: contact.id,
        name: contact.name,
        instagramId: senderIgsid,
      },
      channel: 'INSTAGRAM',
    })

    console.log(`[Instagram Webhook] Mensagem ${messageId} persistida (conversa ${conversation.id})`)
  }
}

/**
 * Best-effort: try to get the Instagram user's name via Graph API.
 * Requires the page token to have the pages_messaging permission.
 */
async function fetchInstagramUserName(igsid: string, pageToken?: string | null): Promise<string | null> {
  if (!pageToken) return null
  try {
    const url = `https://graph.facebook.com/v19.0/${igsid}?fields=name&access_token=${pageToken}`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json() as any
    return json?.name ?? null
  } catch {
    return null
  }
}
