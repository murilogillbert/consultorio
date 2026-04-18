import { ServicesService } from './ServicesService'

export async function updateServiceService(id: string, data: any) {
  const svc = new ServicesService()
  return svc.executeUpdate(id, data)
}
