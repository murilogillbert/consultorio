import { Request, Response, NextFunction } from 'express'
import { AppointmentsService } from '../services/AppointmentsService'
import { AppointmentsRepository } from '../../patients/repositories/PatientsRepository'

export class AppointmentsController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { start, end } = req.query as { start: string; end: string }
      
      const appointmentsRepository = new AppointmentsRepository()
      const appointmentsService = new AppointmentsService(appointmentsRepository)

      const result = await appointmentsService.executeList(
        new Date(start || new Date().toISOString()),
        new Date(end || new Date().toISOString())
      )

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body
      
      const appointmentsRepository = new AppointmentsRepository()
      const appointmentsService = new AppointmentsService(appointmentsRepository)

      const result = await appointmentsService.executeCreate(data)

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { status } = req.body
      const appointmentsRepository = new AppointmentsRepository()
      const appointmentsService = new AppointmentsService(appointmentsRepository)
      const result = await appointmentsService.executeUpdateStatus(id, status)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { reason } = req.body
      
      const appointmentsRepository = new AppointmentsRepository()
      const appointmentsService = new AppointmentsService(appointmentsRepository)

      const result = await appointmentsService.executeCancel(id, reason)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
