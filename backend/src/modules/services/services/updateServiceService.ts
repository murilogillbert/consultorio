import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories'
import { UpdateServiceDto } from '../dtos/updateServiceDto'

export async function updateServiceService(id: string, data: UpdateServiceDto) {
  const repo = new ServicesRepository()
  return repo.update(id, data)
}
