import { Request, Response, NextFunction } from 'express'
import { createReviewService } from '../services/createReviewService'
import { getReviewsByProfessionalService } from '../services/getReviewsByProfessionalService'
import { listReviewsService } from '../services/listReviewsService'
import { requireSingleString } from '../../../shared/utils/requestUtils'

export class ReviewsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await createReviewService(req.body)
      res.status(201).json(review)
    } catch (err) {
      next(err)
    }
  }

  async byProfessional(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = requireSingleString(req.params.professionalId, 'professionalId')
      const result = await getReviewsByProfessionalService(professionalId)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { professionalId, minRating, page, limit } = req.query as Record<string, string>
      const result = await listReviewsService({
        professionalId,
        minRating: minRating ? Number(minRating) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      })
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
}
