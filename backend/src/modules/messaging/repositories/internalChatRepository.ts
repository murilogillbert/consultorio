import { prisma } from '../../../config/database'
import { InternalMessage, Prisma } from '@prisma/client'

export class InternalChatRepository {
  async createMessage(data: Prisma.InternalMessageUncheckedCreateInput): Promise<InternalMessage> {
    return prisma.internalMessage.create({
      data,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    })
  }

  async listMessages(channelId: string, limit = 50): Promise<InternalMessage[]> {
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

  async listChannels(clinicId: string) {
    return prisma.internalChannel.findMany({
      where: { clinicId, active: true },
      include: {
        _count: { select: { members: true, messages: true } },
      },
      orderBy: { name: 'asc' },
    })
  }
}
