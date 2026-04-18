import { sendReminderJob } from '../jobs/sendReminderJob'

const INTERVAL_MS = 60 * 60 * 1000 // 1 hora

let timer: ReturnType<typeof setInterval> | null = null

export function startReminderWorker() {
  if (timer) return
  console.log('[Worker] reminderWorker iniciado (intervalo: 1h)')

  // Executa imediatamente ao iniciar, depois a cada 1h
  sendReminderJob()
  timer = setInterval(sendReminderJob, INTERVAL_MS)
}

export function stopReminderWorker() {
  if (timer) {
    clearInterval(timer)
    timer = null
    console.log('[Worker] reminderWorker parado')
  }
}
