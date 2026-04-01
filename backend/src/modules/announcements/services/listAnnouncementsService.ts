import { prisma } from '../../../config/database'

export class ListAnnouncementsService {
  async execute(clinicId?: string) {
    return prisma.announcement.findMany({
      where: {
        active: true,
        ...(clinicId ? { clinicId } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      include: {
        publishedBy: { select: { id: true, name: true, avatarUrl: true } },
        reads: { select: { userId: true, readAt: true } },
        _count: { select: { reads: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
