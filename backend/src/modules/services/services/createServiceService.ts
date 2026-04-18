import { ServicesService } from './ServicesService'

export async function createServiceService(data: any) {
  const svc = new ServicesService()
  return svc.executeCreate(data)
}
