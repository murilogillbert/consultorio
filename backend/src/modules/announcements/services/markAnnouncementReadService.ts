import { AnnouncementReadRepository } from '../repositories/announcementsRepository'

export class MarkAnnouncementReadService {
  private readRepo: AnnouncementReadRepository

  constructor(readRepo: AnnouncementReadRepository) {
    this.readRepo = readRepo
  }

  async execute(announcementId: string, userId: string) {
    return this.readRepo.markAsRead(announcementId, userId)
  }
}
