import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories/servicesRepository'

export async function updateServiceService(id: string, data: any) {
  const svc = new ServicesService(new ServicesRepository())
  return svc.executeUpdate(id, data)
}
