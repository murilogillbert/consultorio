import { PatientsService } from './PatientsService'
import { PatientsRepository } from '../repositories/PatientsRepository'

export async function searchPatientsService(query: string) {
  const svc = new PatientsService(new PatientsRepository())
  return svc.executeSearch(query)
}
