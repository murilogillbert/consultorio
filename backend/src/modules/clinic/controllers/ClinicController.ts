import { Request, Response, NextFunction } from 'express'
import { ClinicService } from '../services/ClinicService'
import { ClinicRepository } from '../repositories/clinicRepository'

export class ClinicController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeCreate(data)

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeList()

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeFindById(id)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = req.body

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeUpdate(id, data)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
