import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories'

export async function archiveServiceService(id: string) {
  const repo = new ServicesRepository()
  return repo.archive(id)
}
