import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories'

export async function getServiceService(id: string) {
  const repo = new ServicesRepository()
  return repo.findById(id)
}
