import { prisma } from '../../../../config/database'
import { emitToClinic } from '../../../../shared/websocket/socketServer'
import { AppError } from '../../../../shared/errors/AppError'

export class InternalChatService {
  async listMessages(channelId: string, limit = 50) {
    return prisma.internalMessage.findMany({
      where: { channelId, deletedAt: null },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { pins: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  async sendMessage(channelId: string, senderId: string, content: string, replyToId?: string) {
    return prisma.internalMessage.create({
      data: { channelId, senderId, content, type: 'TEXT', replyToId },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    })
  }

  async listConversations(clinicId?: string) {
    return prisma.conversation.findMany({
      where: { ...(clinicId ? { clinicId } : {}), status: 'OPEN' },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, createdAt: true, direction: true, readAt: true, sentById: true, type: true, conversationId: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })
  }

  async listConversationMessages(conversationId: string) {
    return prisma.externalMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async sendConversationMessage(conversationId: string, content: string, sentById?: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, clinicId: true, channel: true },
    })

    if (!conversation) {
      throw new AppError('Conversa não encontrada', 404)
    }

    const normalizedContent = content.trim()
    if (!normalizedContent) {
      throw new AppError('Conteúdo da mensagem é obrigatório', 400)
    }

    const msg = await prisma.externalMessage.create({
      data: {
        conversationId,
        content: normalizedContent,
        direction: 'OUT',
        type: 'TEXT',
        sentById,
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    emitToClinic(conversation.clinicId, 'messaging:message_sent', { conversationId, message: msg })
    return msg
  }
}
