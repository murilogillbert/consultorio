import { SchedulesService } from './SchedulesService'

export async function unblockDateService(blockId: string) {
  const svc = new SchedulesService()
  return svc.executeDeleteBlock(blockId)
}
