/**
 * sendOutboundMessageService.ts
 *
 * Routes an outbound text message to the correct channel adapter
 * (WhatsApp, Instagram, Gmail) based on the conversation's channel field.
 *
 * Persists the ExternalMessage record and emits a Socket.io event.
 */

import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'
import { emitToClinic } from '../../../shared/websocket/socketServer'

export async function sendOutboundMessageService(
  conversationId: string,
  content: string,
  _senderUserId?: string,
): Promise<void> {
  if (!content?.trim()) throw new AppError('Conteúdo da mensagem é obrigatório', 400)

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true },
  })

  if (!conversation) throw new AppError('Conversa não encontrada', 404)

  const { channel, clinicId, contact } = conversation

  switch (channel) {
    case 'WHATSAPP': {
      await sendViaWhatsApp(clinicId, conversation.id, contact?.phone ?? '', content)
      break
    }

    case 'INSTAGRAM': {
      const igsid = contact?.instagramId
      if (!igsid) throw new AppError('IGSID do contato não encontrado', 422)
      const { sendInstagramMessageAndPersist } = await import('../channels/instagram/instagramAdapter')
      await sendInstagramMessageAndPersist({
        clinicId,
        conversationId,
        recipientIgsid: igsid,
        text: content,
        senderId: _senderUserId,
      })
      return // adapter already persists
    }

    case 'GMAIL': {
      await sendViaGmail(clinicId, conversation, contact, content)
      break
    }

    default:
      throw new AppError(`Canal "${channel}" não suporta envio de mensagens por aqui`, 400)
  }

  // Persist outbound message for WhatsApp / Gmail
  // (Instagram already returned early above after calling its own persist)
  {
    const savedMessage = await prisma.externalMessage.create({
      data: {
        conversationId,
        channelMessageId: `out-${Date.now()}`,
        direction: 'OUT',
        type: 'TEXT',
        content,
        metadata: JSON.stringify({ channel }),
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    emitToClinic(clinicId, 'messaging:new_message', {
      conversationId,
      message: savedMessage,
      channel,
    })
  }
}

// ─── Channel implementations ─────────────────────────────────────────────────

async function sendViaWhatsApp(clinicId: string, conversationId: string, phone: string, text: string) {
  if (!phone) throw new AppError('Número de telefone do contato não encontrado', 422)

  // Get clinic's WA credentials
  const settings = await prisma.integrationSettings.findUnique({
    where: { clinicId },
    select: { waAccessToken: true, waPhoneNumberId: true },
  })

  const { WhatsappAdapter } = await import('../channels/whatsapp/whatsappAdapter')
  const adapter = new WhatsappAdapter(
    settings?.waAccessToken ?? undefined,
    settings?.waPhoneNumberId ?? undefined,
  )

  const result = await adapter.sendTextMessage(phone, text)
  const messageId = result?.messages?.[0]?.id ?? `wa-out-${Date.now()}`
  console.log(`[Outbound WA] Mensagem enviada para ${phone}: ${messageId}`)
}

async function sendViaGmail(
  clinicId: string,
  conversation: any,
  contact: any,
  text: string,
) {
  const recipientEmail = contact?.email
  if (!recipientEmail) throw new AppError('E-mail do contato não encontrado', 422)

  const { GmailApiService } = await import('../channels/gmail/gmailApiService')
  const gmailApi = new GmailApiService()

  const metadata = conversation.metadata ? JSON.parse(conversation.metadata as string) : {}
  const threadId = (conversation as any).channelThreadId ?? metadata.threadId

  await gmailApi.sendEmail(clinicId, {
    to: recipientEmail,
    subject: metadata.lastSubject ?? 'Re: Contato via clínica',
    html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
    text,
    threadId,
  })

  console.log(`[Outbound Gmail] E-mail enviado para ${recipientEmail}`)
}
