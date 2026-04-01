import { Request, Response, NextFunction } from 'express'
import { SchedulesService } from '../services/SchedulesService'

export class SchedulesController {
  async getSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { professionalId } = req.params as { professionalId: string }

      const schedulesService = new SchedulesService()
      const result = await schedulesService.executeGetSchedule(professionalId)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async setSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { professionalId } = req.params as { professionalId: string }
      const { slots } = req.body

      const schedulesService = new SchedulesService()
      const result = await schedulesService.executeSetSchedule(professionalId, slots)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async getAvailableSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { professionalId } = req.params as { professionalId: string }
      const { date, serviceId } = req.query as { date: string; serviceId: string }

      const schedulesService = new SchedulesService()
      const result = await schedulesService.executeGetAvailableSlots(professionalId, date, serviceId)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async createBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { professionalId } = req.params as { professionalId: string }
      const data = req.body

      const schedulesService = new SchedulesService()
      const result = await schedulesService.executeCreateBlock(professionalId, data)

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async deleteBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { blockId } = req.params as { blockId: string }

      const schedulesService = new SchedulesService()
      await schedulesService.executeDeleteBlock(blockId)

      res.status(200).json({ message: 'Bloqueio removido com sucesso' })
    } catch (err) {
      next(err)
    }
  }
}
