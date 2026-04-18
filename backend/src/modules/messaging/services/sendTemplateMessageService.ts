import { prisma } from '../../../config/database'
import { WhatsappAdapter } from '../channels/whatsapp/whatsappAdapter'
import { AppError } from '../../../shared/errors/AppError'
import { resolveWhatsappCredentials } from './resolveWhatsappCredentials'

interface SendTemplateInput {
  conversationId: string
  templateName: string
  languageCode?: string
  components?: any[]
  sentById?: string
  waToken?: string
  waPhoneId?: string
}

export async function sendTemplateMessageService(input: SendTemplateInput) {
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

  const credentials = await resolveWhatsappCredentials({
    clinicId: conversation.clinicId,
    waToken: input.waToken,
    waPhoneId: input.waPhoneId,
  })

  if (!credentials.accessToken || !credentials.phoneNumberId) {
    throw new AppError('WhatsApp não configurado para esta clínica', 422)
  }

  const wa = new WhatsappAdapter(credentials.accessToken, credentials.phoneNumberId)
  const response = await wa.sendTemplateMessage(
    conversation.contact.phone,
    input.templateName,
    input.languageCode ?? 'pt_BR',
    input.components ?? [],
  )

  const waMessageId = response.messages?.[0]?.id

  const message = await prisma.externalMessage.create({
    data: {
      conversationId: input.conversationId,
      channelMessageId: waMessageId,
      direction: 'OUT',
      type: 'TEMPLATE',
      content: input.templateName,
      sentById: input.sentById,
      metadata: JSON.stringify({ templateName: input.templateName, components: input.components }),
    },
  })

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { lastMessageAt: new Date() },
  })

  console.log(`[Messaging] Template "${input.templateName}" enviado para ${conversation.contact.phone}. WA ID: ${waMessageId}`)

  return message
}
