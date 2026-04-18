import { PatientsService } from './PatientsService'
import { PatientsRepository } from '../repositories/PatientsRepository'
import { UpdatePatientDto } from '../dtos/updatePatientDto'

export async function updatePatientService(id: string, dto: UpdatePatientDto) {
  const svc = new PatientsService(new PatientsRepository())
  return svc.executeUpdate(id, dto as any)
}
