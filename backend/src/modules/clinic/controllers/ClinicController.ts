import { Request, Response, NextFunction } from 'express'
import { ClinicService } from '../services/ClinicService'
import { ClinicRepository } from '../repositories/ClinicRepository'

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

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeGetByUserId(userId)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async getIntegrations(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = { ...req.params, ...req.query } as { clinicId: string }
      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.getIntegrations(clinicId)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async updateIntegrations(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.params as { clinicId: string }
      const data = req.body

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.updateIntegrations(clinicId, data)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async testIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, type } = req.params as { clinicId: string; type: string }

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.testIntegration(clinicId, type)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
