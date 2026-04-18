import { prisma } from '../../../config/database'
import { WhatsappAdapter } from '../channels/whatsapp/whatsappAdapter'
import { AppError } from '../../../shared/errors/AppError'

interface SendMessageInput {
  conversationId: string
  content: string
  sentById?: string
  /** Credenciais opcionais — usa as globais do .env se omitido */
  waToken?: string
  waPhoneId?: string
}

/**
 * Envia uma mensagem de texto em uma conversa existente.
 * - Busca o número do contato na conversa
 * - Envia via WhatsApp Business API
 * - Persiste a mensagem enviada (direction: OUT) no banco
 * - Atualiza lastMessageAt da conversa
 */
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

  // Envia via API do WhatsApp
  const wa = new WhatsappAdapter(input.waToken, input.waPhoneId)
  const response = await wa.sendTextMessage(conversation.contact.phone, input.content)

  const waMessageId = response.messages?.[0]?.id

  // Persiste a mensagem enviada
  const message = await prisma.externalMessage.create({
    data: {
      conversationId: input.conversationId,
      channelMessageId: waMessageId,
      direction: 'OUT',
      type: 'TEXT',
      content: input.content,
      sentById: input.sentById,
    },
  })

  // Atualiza timestamp da conversa
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { lastMessageAt: new Date() },
  })

  console.log(`[Messaging] Mensagem enviada para ${conversation.contact.phone}. WA ID: ${waMessageId}`)

  return message
}
