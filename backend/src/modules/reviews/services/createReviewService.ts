import { ReviewsRepository } from '../repositories/reviewsRepository'
import { CreateReviewDto } from '../dtos/createReviewDto'
import { AppError } from '../../../shared/errors/AppError'

const reviewsRepository = new ReviewsRepository()

export async function createReviewService(dto: CreateReviewDto) {
  if (dto.rating < 1 || dto.rating > 5) {
    throw new AppError('A avaliação deve ser entre 1 e 5', 400)
  }

  // Prevent duplicate review for the same appointment
  if (dto.appointmentId) {
    const existing = await reviewsRepository.findByAppointment(dto.appointmentId)
    if (existing) {
      throw new AppError('Já existe uma avaliação para esta consulta', 400)
    }
  }

  return reviewsRepository.create({
    professionalId: dto.professionalId,
    appointmentId: dto.appointmentId,
    rating: dto.rating,
    comment: dto.comment,
    public: dto.public ?? true,
  })
}
