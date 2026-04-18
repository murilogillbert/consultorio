import { expireAnnouncementJob } from '../jobs/expireAnnouncementJob'

const INTERVAL_MS = 30 * 60 * 1000 // 30 minutos

let timer: ReturnType<typeof setInterval> | null = null

export function startAuditWorker() {
  if (timer) return
  console.log('[Worker] auditWorker iniciado (intervalo: 30min)')
  expireAnnouncementJob()
  timer = setInterval(expireAnnouncementJob, INTERVAL_MS)
}

export function stopAuditWorker() {
  if (timer) {
    clearInterval(timer)
    timer = null
    console.log('[Worker] auditWorker parado')
  }
}
