import { prisma } from '../../../config/database'
import { Conversation, Prisma } from '@prisma/client'

export class ConversationsRepository {
  async findById(id: string): Promise<Conversation | null> {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
  }

  async findByClinic(clinicId: string, status?: string): Promise<Conversation[]> {
    return prisma.conversation.findMany({
      where: {
        clinicId,
        ...(status ? { status } : {}),
      },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    })
  }

  async update(id: string, data: Prisma.ConversationUpdateInput): Promise<Conversation> {
    return prisma.conversation.update({ where: { id }, data })
  }
}
