import { AnnouncementRepository } from '../repositories/announcementsRepository'
import { AppError } from '../../../shared/errors/AppError'

export class GetAnnouncementReadStatsService {
  private repo: AnnouncementRepository

  constructor(repo: AnnouncementRepository) {
    this.repo = repo
  }

  async execute(id: string) {
    const announcement = await this.repo.findWithReads(id)
    if (!announcement) throw new AppError('Aviso não encontrado', 404)

    const reads = (announcement as any).reads || []
    return {
      announcementId: id,
      totalReads: reads.length,
      readers: reads.map((r: any) => ({
        userId: r.userId,
        name: r.user?.name,
        readAt: r.readAt,
      })),
    }
  }
}
