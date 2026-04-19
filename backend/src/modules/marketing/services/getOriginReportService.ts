import { OriginRepository } from '../repositories/originRepository'

const originRepository = new OriginRepository()

export async function getOriginReportService(clinicId: string, startDate: string, endDate: string) {
  return originRepository.getSourceBreakdown(clinicId, new Date(startDate), new Date(endDate))
}
