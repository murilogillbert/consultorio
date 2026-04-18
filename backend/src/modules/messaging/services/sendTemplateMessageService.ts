import { prisma } from '../../../config/database'
import { WhatsappAdapter } from '../channels/whatsapp/whatsappAdapter'
import { AppError } from '../../../shared/errors/AppError'

interface SendTemplateInput {
  conversationId: string
  templateName: string
  languageCode?: string
  components?: any[]
  sentById?: string
  /** Credenciais opcionais — usa as globais do .env se omitido */
  waToken?: string
  waPhoneId?: string
}

/**
 * Envia uma mensagem de template HSM (WhatsApp Business) em uma conversa.
 * Templates precisam ser aprovados previamente no Meta Business Manager.
 */
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

  const wa = new WhatsappAdapter(input.waToken, input.waPhoneId)
  const response = await wa.sendTemplateMessage(
    conversation.contact.phone,
    input.templateName,
    input.languageCode ?? 'pt_BR',
    input.components ?? [],
  )

  const waMessageId = response.messages?.[0]?.id

  // Persiste como mensagem de template (OUT)
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
