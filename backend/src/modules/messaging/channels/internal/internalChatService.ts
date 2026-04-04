import { prisma } from '../../../../config/database'

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
          select: { content: true, createdAt: true, direction: true },
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
    const msg = await prisma.externalMessage.create({
      data: {
        conversationId,
        direction: 'OUT',
        type: 'TEXT',
        content,
        sentById,
      },
    })
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })
    return msg
  }

  async markConversationAsRead(conversationId: string) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    })
  }
}
