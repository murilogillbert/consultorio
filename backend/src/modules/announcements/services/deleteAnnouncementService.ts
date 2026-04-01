import { AnnouncementRepository } from '../repositories/announcementsRepository'
import { AppError } from '../../../shared/errors/AppError'

export class DeleteAnnouncementService {
  private repo: AnnouncementRepository

  constructor(repo: AnnouncementRepository) {
    this.repo = repo
  }

  async execute(id: string) {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('Aviso não encontrado', 404)

    // Soft delete — marca como inativo
    return this.repo.update(id, { active: false })
  }
}
