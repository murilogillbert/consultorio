import { Request, Response, NextFunction } from 'express'
import { listEventsService } from '../services/listEventsService'
import { exportEventsService } from '../services/exportEventsService'

export class AuditController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, userId, action, startDate, endDate, page, limit } = req.query as Record<string, string>
      const result = await listEventsService({
        clinicId,
        userId,
        action,
        startDate,
        endDate,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      })
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async export(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, userId, action, startDate, endDate } = req.query as Record<string, string>
      const csv = await exportEventsService({ clinicId, userId, action, startDate, endDate })
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"')
      res.send(csv)
    } catch (err) {
      next(err)
    }
  }
}
