import { PatientsService } from './PatientsService'
import { PatientsRepository } from '../repositories/PatientsRepository'
import { CreatePatientDto } from '../dtos/createPatientDto'

export async function createPatientService(dto: CreatePatientDto) {
  const svc = new PatientsService(new PatientsRepository())
  return svc.executeCreate(dto as any)
}
