import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories/servicesRepository'

export async function createServiceService(data: any) {
  const svc = new ServicesService(new ServicesRepository())
  return svc.executeCreate(data)
}
