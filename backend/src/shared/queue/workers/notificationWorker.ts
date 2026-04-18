import { sendNotificationJob } from '../jobs/sendNotificationJob'

// Executa 1x por dia às 09:00 — usando setInterval com verificação de hora
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // verifica a cada hora
let lastRunDate = ''
let timer: ReturnType<typeof setInterval> | null = null

async function tick() {
  const now = new Date()
  const hour     = now.getHours()
  const dateStr  = now.toISOString().slice(0, 10)

  // Dispara entre 09:00 e 09:59, uma vez por dia
  if (hour === 9 && dateStr !== lastRunDate) {
    lastRunDate = dateStr
    await sendNotificationJob()
  }
}

export function startNotificationWorker() {
  if (timer) return
  console.log('[Worker] notificationWorker iniciado (dispara diariamente às 09h)')
  tick() // verifica logo ao subir
  timer = setInterval(tick, CHECK_INTERVAL_MS)
}

export function stopNotificationWorker() {
  if (timer) {
    clearInterval(timer)
    timer = null
    console.log('[Worker] notificationWorker parado')
  }
}
