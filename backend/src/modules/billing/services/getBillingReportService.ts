import { BillingRepository } from '../repositories/billingRepository'
import { AppError } from '../../../shared/errors/AppError'

const billingRepository = new BillingRepository()

export async function getBillingReportService(clinicId: string, startDate: string, endDate: string) {
  if (!clinicId) throw new AppError('clinicId é obrigatório', 400)
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Datas inválidas', 400)
  }
  return billingRepository.getBillingReport(clinicId, start, end)
}