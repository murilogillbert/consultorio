import { prisma } from '../../../config/database'
import { ProfessionalReview, Prisma } from '@prisma/client'

export class ReviewsRepository {
  async create(data: Prisma.ProfessionalReviewUncheckedCreateInput): Promise<ProfessionalReview> {
    return prisma.professionalReview.create({ data })
  }

  async findByProfessional(professionalId: string): Promise<ProfessionalReview[]> {
    return prisma.professionalReview.findMany({
      where: { professionalId, public: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findAll(params: {
    professionalId?: string
    minRating?: number
    skip?: number
    take?: number
  }): Promise<{ reviews: ProfessionalReview[]; total: number }> {
    const where: Prisma.ProfessionalReviewWhereInput = {
      ...(params.professionalId ? { professionalId: params.professionalId } : {}),
      ...(params.minRating ? { rating: { gte: params.minRating } } : {}),
    }
    const [reviews, total] = await Promise.all([
      prisma.professionalReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.professionalReview.count({ where }),
    ])
    return { reviews, total }
  }

  async averageRating(professionalId: string): Promise<number> {
    const result = await prisma.professionalReview.aggregate({
      where: { professionalId },
      _avg: { rating: true },
    })
    return result._avg.rating ?? 0
  }

  async findByAppointment(appointmentId: string): Promise<ProfessionalReview | null> {
    return prisma.professionalReview.findFirst({
      where: { appointmentId },
    })
  }
}
