import { SchedulesService } from './SchedulesService'

export async function setScheduleService(professionalId: string, slots: SetScheduleSlot[]) {
  const svc = new SchedulesService()
  return svc.executeSetSchedule(professionalId, slots)
}

export interface SetScheduleSlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}
