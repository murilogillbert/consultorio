import { ServicesService } from './ServicesService'

export async function archiveServiceService(id: string) {
  const svc = new ServicesService()
  return svc.executeArchive(id)
}
