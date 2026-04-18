import { PatientsService } from './PatientsService'
import { PatientsRepository } from '../repositories/PatientsRepository'

export async function listPatientsService() {
  const svc = new PatientsService(new PatientsRepository())
  return svc.executeList()
}
