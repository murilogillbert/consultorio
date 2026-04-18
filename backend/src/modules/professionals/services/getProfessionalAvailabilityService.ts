import { ProfessionalsService } from './ProfessionalsService'
import { ProfessionalsRepository } from '../repositories/professionalsRepository'

export async function getProfessionalAvailabilityService(professionalId: string, date: string) {
  const svc = new ProfessionalsService(new ProfessionalsRepository())
  return svc.executeGetAvailability(professionalId, new Date(date))
}
