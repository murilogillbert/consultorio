import { ProfessionalsService } from './ProfessionalsService'
import { ProfessionalsRepository } from '../repositories/professionalsRepository'

export async function listProfessionalsService() {
  const svc = new ProfessionalsService(new ProfessionalsRepository())
  return svc.executeList()
}
