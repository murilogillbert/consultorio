import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories/servicesRepository'

export async function listServicesService() {
  const svc = new ServicesService(new ServicesRepository())
  return svc.executeList()
}
