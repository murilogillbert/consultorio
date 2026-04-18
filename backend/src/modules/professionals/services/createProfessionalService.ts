import { ProfessionalsService } from './ProfessionalsService'
import { ProfessionalsRepository } from '../repositories/professionalsRepository'
import { CreateProfessionalDto } from '../dtos/createProfessionalDto'

export async function createProfessionalService(dto: CreateProfessionalDto) {
  const svc = new ProfessionalsService(new ProfessionalsRepository())
  return svc.executeCreate(dto as any)
}
