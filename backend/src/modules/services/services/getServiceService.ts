import { ServicesService } from './ServicesService'

export async function getServiceService(id: string) {
  const svc = new ServicesService()
  return svc.executeGet(id)
}
