import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories/servicesRepository'

export async function getServiceService(id: string) {
  const svc = new ServicesService(new ServicesRepository())
  return svc.executeGet(id)
}
