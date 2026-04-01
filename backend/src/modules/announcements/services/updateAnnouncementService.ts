import { AnnouncementRepository } from '../repositories/announcementsRepository'
import { AppError } from '../../../shared/errors/AppError'

interface UpdateAnnouncementDTO {
  id: string
  title?: string
  content?: string
  fileUrl?: string
  urgency?: 'NORMAL' | 'IMPORTANT' | 'URGENT'
  audience?: 'ALL' | 'STAFF' | 'PROFESSIONALS' | 'SPECIFIC'
  audienceIds?: string
  expiresAt?: Date | null
}

export class UpdateAnnouncementService {
  private repo: AnnouncementRepository

  constructor(repo: AnnouncementRepository) {
    this.repo = repo
  }

  async execute({ id, ...data }: UpdateAnnouncementDTO) {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('Aviso não encontrado', 404)

    return this.repo.update(id, data)
  }
}
