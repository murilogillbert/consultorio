import { Request, Response, NextFunction } from 'express'
import { PatientsService } from '../services/PatientsService'
import { PatientsRepository } from '../repositories/PatientsRepository'

export class PatientsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, cpf, phone, birthDate, address } = req.body

      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      const result = await patientsService.executeCreate({
        userId: userId || req.user.id,
        cpf,
        phone,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        address,
      })

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query as { q?: string }
      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      let result
      if (q) {
        result = await patientsService.executeSearch(q)
      } else {
        result = await patientsService.executeList()
      }

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      const result = await patientsService.executeFindById(id)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = req.body

      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      const result = await patientsService.executeUpdate(id, data)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
