import { ProfessionalsService } from './ProfessionalsService'
import { ProfessionalsRepository } from '../repositories/professionalsRepository'

export async function getProfessionalService(id: string) {
  const svc = new ProfessionalsService(new ProfessionalsRepository())
  return svc.executeGet(id)
}
