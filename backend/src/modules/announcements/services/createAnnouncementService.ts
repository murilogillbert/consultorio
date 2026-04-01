import { AnnouncementRepository } from '../repositories/announcementsRepository'
import { AppError } from '../../../shared/errors/AppError'

interface CreateAnnouncementDTO {
  clinicId: string
  publishedById: string
  title: string
  content: string
  fileUrl?: string
  urgency?: 'NORMAL' | 'IMPORTANT' | 'URGENT'
  audience?: 'ALL' | 'STAFF' | 'PROFESSIONALS' | 'SPECIFIC'
  audienceIds?: string
  expiresAt?: Date
}

export class CreateAnnouncementService {
  private repo: AnnouncementRepository

  constructor(repo: AnnouncementRepository) {
    this.repo = repo
  }

  async execute(data: CreateAnnouncementDTO) {
    if (!data.title || !data.content) {
      throw new AppError('Título e conteúdo são obrigatórios', 400)
    }

    return this.repo.create({
      title: data.title,
      content: data.content,
      fileUrl: data.fileUrl,
      urgency: data.urgency || 'NORMAL',
      audience: data.audience || 'ALL',
      audienceIds: data.audienceIds,
      expiresAt: data.expiresAt,
      active: true,
      clinic: { connect: { id: data.clinicId } },
      publishedBy: { connect: { id: data.publishedById } },
    })
  }
}
