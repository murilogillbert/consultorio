import { ServicesService } from './ServicesService'
import { ServicesRepository } from '../repositories/servicesRepository'

export async function archiveServiceService(id: string) {
  const svc = new ServicesService(new ServicesRepository())
  return svc.executeArchive(id)
}
