import { ReviewsRepository } from '../repositories/reviewsRepository'

const reviewsRepository = new ReviewsRepository()

export async function listReviewsService(params: {
  professionalId?: string
  minRating?: number
  page?: number
  limit?: number
}) {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, params.limit ?? 20)
  const skip = (page - 1) * limit

  const { reviews, total } = await reviewsRepository.findAll({
    professionalId: params.professionalId,
    minRating: params.minRating,
    skip,
    take: limit,
  })

  return {
    data: reviews,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  }
}
