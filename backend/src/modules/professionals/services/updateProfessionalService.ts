import { ProfessionalsService } from './ProfessionalsService'
import { ProfessionalsRepository } from '../repositories/professionalsRepository'
import { UpdateProfessionalDto } from '../dtos/updateProfessionalDto'

export async function updateProfessionalService(id: string, dto: UpdateProfessionalDto) {
  const svc = new ProfessionalsService(new ProfessionalsRepository())
  return svc.executeUpdate(id, dto as any)
}
