import { SchedulesService } from './SchedulesService'

export async function getAvailableSlotsService(professionalId: string, date: string, serviceId: string) {
  const svc = new SchedulesService()
  return svc.executeGetAvailableSlots(professionalId, date, serviceId)
}
