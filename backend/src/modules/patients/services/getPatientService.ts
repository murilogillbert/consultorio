import { PatientsService } from './PatientsService'
import { PatientsRepository } from '../repositories/PatientsRepository'

export async function getPatientService(id: string) {
  const svc = new PatientsService(new PatientsRepository())
  return svc.executeFindById(id)
}
