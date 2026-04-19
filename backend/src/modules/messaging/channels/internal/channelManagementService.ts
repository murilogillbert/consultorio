import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export class ChannelManagementService {
  async createChannel(params: {
    clinicId: string
    name: string
    description?: string
    type?: string
    adminOnly?: boolean
    createdById?: string
  }) {
    return prisma.internalChannel.create({
      data: {
        clinicId: params.clinicId,
        name: params.name,
        description: params.description,
        type: params.type ?? 'CHANNEL',
        adminOnly: params.adminOnly ?? false,
        createdById: params.createdById,
      },
    })
  }

  async addMember(channelId: string, userId: string) {
    const channel = await prisma.internalChannel.findUnique({ where: { id: channelId } })
    if (!channel) throw new AppError('Canal não encontrado', 404)
    return prisma.channelMember.upsert({
      where: { channelId_userId: { channelId, userId } },
      create: { channelId, userId },
      update: {},
    })
  }

  async removeMember(channelId: string, userId: string) {
    await prisma.channelMember.deleteMany({ where: { channelId, userId } })
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
