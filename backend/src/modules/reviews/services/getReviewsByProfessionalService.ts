import { ReviewsRepository } from '../repositories/reviewsRepository'
import { AppError } from '../../../shared/errors/AppError'

const reviewsRepository = new ReviewsRepository()

export async function getReviewsByProfessionalService(professionalId: string) {
  if (!professionalId) throw new AppError('professionalId é obrigatório', 400)

  const reviews = await reviewsRepository.findByProfessional(professionalId)
  const average = await reviewsRepository.averageRating(professionalId)

  return { reviews, average: Math.round(average * 10) / 10, total: reviews.length }
}
