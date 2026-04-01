import { AnnouncementRepository } from '../repositories/announcementsRepository'
import { AppError } from '../../../shared/errors/AppError'

export class ResendAnnouncementService {
  private repo: AnnouncementRepository

  constructor(repo: AnnouncementRepository) {
    this.repo = repo
  }

  async execute(id: string) {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('Aviso não encontrado', 404)

    // Reativa e reseta expiração para nulo (sem prazo)
    return this.repo.update(id, { active: true, expiresAt: null, updatedAt: new Date() })
  }
}
