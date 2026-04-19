/**
 * instagramAdapter.ts
 *
 * Sends Instagram Direct Messages via the Meta Graph API.
 * Uses the Page Access Token stored in IntegrationSettings.igAccessToken.
 *
 * Docs: https://developers.facebook.com/docs/messenger-platform/instagram/features/send-messages
 */

import { prisma } from '../../../../config/database'
import { AppError } from '../../../../shared/errors/AppError'

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

export interface SendInstagramMessageParams {
  clinicId: string
  recipientIgsid: string
  text: string
}

/**
 * Send a text DM to an Instagram user from the clinic's connected Page.
 * Returns the message ID assigned by Meta.
 */
export async function sendInstagramMessage(params: SendInstagramMessageParams): Promise<{ messageId: string }> {
  const { clinicId, recipientIgsid, text } = params

  // Fetch the clinic's Instagram credentials
  const settings = await prisma.integrationSettings.findUnique({
    where: { clinicId },
  })

  if (!settings?.igPageId || !settings?.igAccessToken) {
    throw new AppError('Instagram não configurado para esta clínica', 422)
  }

  const url = `${GRAPH_BASE}/${settings.igPageId}/messages`
  const body = {
    recipient: { id: recipientIgsid },
    message: { text },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.igAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json() as any

  if (!res.ok || json.error) {
    const msg = json.error?.message ?? `Erro ${res.status} ao enviar DM do Instagram`
    throw new AppError(msg, res.status >= 500 ? 502 : 400)
  }

  return { messageId: json.message_id ?? json.id ?? '' }
}

/**
 * Persist an outgoing Instagram DM in the database and emit a Socket.io event.
 */
export async function sendInstagramMessageAndPersist(params: {
  clinicId: string
  conversationId: string
  recipientIgsid: string
  text: string
  senderId?: string // system user ID (optional, for metadata)
}): Promise<void> {
  const { messageId } = await sendInstagramMessage({
    clinicId: params.clinicId,
    recipientIgsid: params.recipientIgsid,
    text: params.text,
  })

  const savedMessage = await prisma.externalMessage.create({
    data: {
      conversationId: params.conversationId,
      channelMessageId: messageId,
      direction: 'OUT',
      type: 'TEXT',
      content: params.text,
      metadata: JSON.stringify({ recipientIgsid: params.recipientIgsid }),
    },
  })

  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { lastMessageAt: new Date() },
  })

  const { emitToClinic } = await import('../../../../shared/websocket/socketServer')
  emitToClinic(params.clinicId, 'messaging:new_message', {
    conversationId: params.conversationId,
    message: savedMessage,
    channel: 'INSTAGRAM',
  })
}
