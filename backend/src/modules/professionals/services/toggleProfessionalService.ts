import { ProfessionalsService } from './ProfessionalsService'
import { ProfessionalsRepository } from '../repositories/professionalsRepository'

export async function toggleProfessionalService(id: string) {
  const svc = new ProfessionalsService(new ProfessionalsRepository())
  return svc.executeToggleActive(id)
}
