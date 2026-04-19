import { Request, Response, NextFunction } from 'express'
import { generateChargeService } from '../services/generateChargeService'
import { refundService } from '../services/refundService'
import { getBillingReportService } from '../services/getBillingReportService'
import { getDelinquencyService } from '../services/getDelinquencyService'
import { getProfessionalPayoutService } from '../services/getProfessionalPayoutService'
import { validateGenerateCharge } from '../validators/billingValidator'
import { requireSingleString } from '../../../shared/utils/requestUtils'

export class BillingController {
  async generateCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body
      validateGenerateCharge(dto)
      const payment = await generateChargeService(dto)
      res.status(201).json(payment)
    } catch (err) {
      next(err)
    }
  }

  async refund(req: Request, res: Response, next: NextFunction) {
    try {
      const id = requireSingleString(req.params.id, 'id')
      await refundService(id)
      res.json({ message: 'Estorno solicitado com sucesso' })
    } catch (err) {
      next(err)
    }
  }

  async report(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, startDate, endDate } = req.query as Record<string, string>
      const result = await getBillingReportService(clinicId, startDate, endDate)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async delinquency(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await getDelinquencyService()
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async professionalPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, startDate, endDate } = req.query as Record<string, string>
      const result = await getProfessionalPayoutService(clinicId, startDate, endDate)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
}