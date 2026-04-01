import { prisma } from '../../../config/database'
import { Announcement, Prisma, AnnouncementRead } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class AnnouncementRepository extends BaseRepository<Announcement, Prisma.AnnouncementCreateInput, Prisma.AnnouncementUpdateInput> {
  constructor() {
    super(prisma.announcement)
  }

  async listActive(): Promise<Announcement[]> {
    return prisma.announcement.findMany({
      where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      include: { publishedBy: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  async findWithReads(id: string): Promise<Announcement | null> {
    return prisma.announcement.findUnique({
      where: { id },
      include: { reads: { include: { user: true } } }
    })
  }
}

export class AnnouncementReadRepository extends BaseRepository<AnnouncementRead, Prisma.AnnouncementReadCreateInput, Prisma.AnnouncementReadUpdateInput> {
  constructor() {
    super(prisma.announcementRead)
  }

  async markAsRead(announcementId: string, userId: string): Promise<AnnouncementRead> {
    return prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      update: { readAt: new Date() },
      create: { announcementId, userId }
    })
  }
}
