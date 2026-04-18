import { ServicesService } from './ServicesService'

export async function listServicesService() {
  const svc = new ServicesService()
  return svc.executeList()
}
