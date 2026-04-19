import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories'

export async function listServicesService(clinicId?: string) {
  const repo = new ServicesRepository()
  return repo.findAll()
}
