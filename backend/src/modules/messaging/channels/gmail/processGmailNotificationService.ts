/**
 * processGmailNotificationService.ts
 *
 * Called by the Pub/Sub webhook handler whenever Google delivers a push
 * notification for a clinic's Gmail inbox.
 *
 * Flow:
 *  1. Receive emailAddress + historyId from the Pub/Sub message data
 *  2. Find the clinic whose OAuth email matches emailAddress
 *  3. Call users.history.list(startHistoryId = lastStoredHistoryId) to get new messages
 *  4. For each new INBOX message, fetch the full message payload
 *  5. Parse From, Subject, snippet, body
 *  6. Upsert Contact → upsert Conversation (GMAIL channel) → create ExternalMessage
 *  7. Emit Socket.io event so the frontend updates in real time
 *  8. Save the new historyId so we don't reprocess on the next notification
 */

import { prisma } from '../../../../config/database'
import { emitToClinic } from '../../../../shared/websocket/socketServer'
import { GmailApiService, extractEmailBody, getHeader, GmailMessage } from './gmailApiService'

const gmailApi = new GmailApiService()

export interface PubSubNotificationPayload {
  /** The Gmail address that received the new mail */
  emailAddress: string
  /** The new history ID reported by Google */
  historyId: string
}

export async function processGmailNotification(payload: PubSubNotificationPayload): Promise<void> {
  const { emailAddress, historyId: newHistoryId } = payload

  // 1. Find the clinic associated with this Gmail account.
  //    We identify it by matching the connected Gmail email.
  //    Since we store tokens but not the email address directly, we derive it
  //    from the emailAddress field Google sends.
  const settings = await prisma.integrationSettings.findFirst({
    where: { gmailConnected: true },
    // If you have multiple clinics, you'd store gmailEmail and match here.
    // For now (single-tenant) we find the first connected clinic.
  })

  if (!settings) {
    console.warn('[Gmail Pub/Sub] Nenhuma clínica com Gmail conectado. Notificação ignorada.')
    return
  }

  const clinicId = settings.clinicId
  const lastHistoryId = (settings as any).gmailHistoryId as string | null

  if (!lastHistoryId) {
    // First notification — just store the historyId as our baseline and wait for the next one
    await (prisma.integrationSettings as any).update({
      where: { clinicId },
      data: { gmailHistoryId: newHistoryId },
    })
    console.log(`[Gmail Pub/Sub] Clínica ${clinicId}: baseline historyId armazenado (${newHistoryId})`)
    return
  }

  // 2. Fetch history since our last known point
  let historyResp: Awaited<ReturnType<typeof gmailApi.historyList>>
  try {
    historyResp = await gmailApi.historyList(clinicId, lastHistoryId)
  } catch (err: any) {
    // historyId too old (410 Gone) → reset baseline and skip
    if (err?.statusCode === 410 || String(err?.message).includes('410')) {
      await (prisma.integrationSettings as any).update({
        where: { clinicId },
        data: { gmailHistoryId: newHistoryId },
      })
      console.warn(`[Gmail Pub/Sub] historyId expirado para clínica ${clinicId}. Baseline redefinido.`)
      return
    }
    throw err
  }

  // 3. Collect all added message IDs (deduplicated)
  const addedMessageIds = new Set<string>()
  for (const entry of historyResp.history ?? []) {
    for (const added of entry.messagesAdded ?? []) {
      // Only process INBOX messages (skip Sent, Drafts, Spam…)
      if (added.message.labelIds?.includes('INBOX')) {
        addedMessageIds.add(added.message.id)
      }
    }
  }

  console.log(`[Gmail Pub/Sub] Clínica ${clinicId}: ${addedMessageIds.size} nova(s) mensagem(ns)`)

  for (const msgId of addedMessageIds) {
    try {
      await ingestMessage(clinicId, msgId, emailAddress)
    } catch (err) {
      console.error(`[Gmail Pub/Sub] Erro ao processar mensagem ${msgId}:`, err)
    }
  }

  // 4. Advance the stored historyId
  await (prisma.integrationSettings as any).update({
    where: { clinicId },
    data: { gmailHistoryId: historyResp.historyId ?? newHistoryId },
  })
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function ingestMessage(
  clinicId: string,
  messageId: string,
  clinicEmailAddress: string,
): Promise<void> {
  // Skip if already ingested
  const existing = await prisma.externalMessage.count({
    where: { channelMessageId: messageId },
  })
  if (existing > 0) {
    console.log(`[Gmail Pub/Sub] Mensagem ${messageId} já processada, ignorada.`)
    return
  }

  const msg: GmailMessage = await gmailApi.messageGet(clinicId, messageId)
  const payload = msg.payload

  const from = getHeader(payload, 'from')       // e.g. "John Doe <john@example.com>"
  const subject = getHeader(payload, 'subject')
  const date = getHeader(payload, 'date')
  const messageIdHeader = getHeader(payload, 'message-id')
  const threadId = msg.threadId

  // Skip messages sent FROM the clinic's own address (outbound mail)
  const fromEmail = extractEmailAddress(from)
  if (fromEmail && fromEmail.toLowerCase() === clinicEmailAddress.toLowerCase()) {
    console.log(`[Gmail Pub/Sub] Mensagem ${messageId} é outbound, ignorada.`)
    return
  }

  const body = extractEmailBody(payload)
  const snippet = msg.snippet ?? ''

  // Upsert Contact by email
  let contact = await prisma.contact.findFirst({
    where: { clinicId, email: fromEmail || from },
  })

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        clinicId,
        email: fromEmail || from,
        name: extractDisplayName(from) || null,
      },
    })
    console.log(`[Gmail Pub/Sub] Novo contato criado: ${contact.id} (${from})`)
  }

  // Find or create open Conversation for this contact on the GMAIL channel
  // Re-use the same conversation if the Gmail thread is still open; otherwise create new
  let conversation = await prisma.conversation.findFirst({
    where: {
      clinicId,
      contactId: contact.id,
      channel: 'GMAIL',
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      channelThreadId: threadId,
    },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        clinicId,
        contactId: contact.id,
        channel: 'GMAIL',
        status: 'OPEN',
        unreadCount: 0,
        channelThreadId: threadId,
      },
    })
    console.log(`[Gmail Pub/Sub] Nova conversa criada: ${conversation.id} (thread ${threadId})`)
  }

  const timestamp = msg.internalDate ? new Date(Number(msg.internalDate)) : new Date()

  const savedMessage = await prisma.externalMessage.create({
    data: {
      conversationId: conversation.id,
      channelMessageId: messageId,
      direction: 'IN',
      type: 'TEXT',
      content: body || snippet,
      metadata: JSON.stringify({
        from,
        subject,
        date,
        messageIdHeader,
        threadId,
        snippet,
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
      email: fromEmail,
      name: contact.name,
    },
    channel: 'GMAIL',
  })

  console.log(`[Gmail Pub/Sub] Mensagem ${messageId} persistida (conversa ${conversation.id})`)
}

/** "John Doe <john@example.com>" → "john@example.com" */
function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  if (match) return match[1].trim()
  return from.trim()
}

/** "John Doe <john@example.com>" → "John Doe" */
function extractDisplayName(from: string): string {
  const match = from.match(/^([^<]+)</)
  if (match) return match[1].trim()
  return ''
}
