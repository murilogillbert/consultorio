import { prisma } from '../../../config/database'
import { WhatsappAdapter } from '../channels/whatsapp/whatsappAdapter'
import { AppError } from '../../../shared/errors/AppError'
import { resolveWhatsappCredentials } from './resolveWhatsappCredentials'

interface SendMessageInput {
  conversationId: string
  content: string
  sentById?: string
  waToken?: string
  waPhoneId?: string
}

export async function sendMessageService(input: SendMessageInput) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
    include: { contact: true },
  })

  if (!conversation) {
    throw new AppError('Conversa não encontrada', 404)
  }

  if (!conversation.contact.phone) {
    throw new AppError('Contato não possui número de telefone cadastrado', 400)
  }

  if (conversation.channel !== 'WHATSAPP') {
    throw new AppError(`Canal "${conversation.channel}" não suportado por este serviço`, 400)
  }

  const content = input.content.trim()
  if (!content) {
    throw new AppError('Conteúdo da mensagem é obrigatório', 400)
  }

  const credentials = await resolveWhatsappCredentials({
    clinicId: conversation.clinicId,
    waToken: input.waToken,
    waPhoneId: input.waPhoneId,
  })

  if (!credentials.accessToken || !credentials.phoneNumberId) {
    throw new AppError('WhatsApp não configurado para esta clínica', 422)
  }

  const wa = new WhatsappAdapter(credentials.accessToken, credentials.phoneNumberId)
  const response = await wa.sendTextMessage(conversation.contact.phone, content)
  const waMessageId = response.messages?.[0]?.id

  const message = await prisma.externalMessage.create({
    data: {
      conversationId: input.conversationId,
      channelMessageId: waMessageId,
      direction: 'OUT',
      type: 'TEXT',
      content,
      sentById: input.sentById,
    },
  })

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { lastMessageAt: new Date() },
  })

  return message
}
