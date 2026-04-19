import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories'
import { CreateServiceDto } from '../dtos/createServiceDto'

export async function createServiceService(data: CreateServiceDto) {
  const repo = new ServicesRepository()
  return repo.create(data)
}
