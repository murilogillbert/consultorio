import { SchedulesService } from './SchedulesService'

export async function blockDateService(professionalId: string, data: { startTime: string; endTime: string; reason?: string }) {
  const svc = new SchedulesService()
  return svc.executeCreateBlock(professionalId, data)
}
