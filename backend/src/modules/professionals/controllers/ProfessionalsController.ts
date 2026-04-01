import { Request, Response, NextFunction } from 'express'
import { ProfessionalsService } from '../services/ProfessionalsService'
import { ProfessionalsRepository } from '../repositories/professionalsRepository'

export class ProfessionalsController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalsRepository = new ProfessionalsRepository()
      const professionalsService = new ProfessionalsService(professionalsRepository)

      const result = await professionalsService.executeList()

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const professionalsRepository = new ProfessionalsRepository()
      const professionalsService = new ProfessionalsService(professionalsRepository)

      const result = await professionalsService.executeGet(id)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body

      const professionalsRepository = new ProfessionalsRepository()
      const professionalsService = new ProfessionalsService(professionalsRepository)

      const result = await professionalsService.executeCreate(data)

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = req.body

      const professionalsRepository = new ProfessionalsRepository()
      const professionalsService = new ProfessionalsService(professionalsRepository)

      const result = await professionalsService.executeUpdate(id, data)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
