import { processPaymentJob } from '../jobs/processPaymentJob'

const INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 horas

let timer: ReturnType<typeof setInterval> | null = null

export function startBillingWorker() {
  if (timer) return
  console.log('[Worker] billingWorker iniciado (intervalo: 4h)')
  processPaymentJob()
  timer = setInterval(processPaymentJob, INTERVAL_MS)
}

export function stopBillingWorker() {
  if (timer) {
    clearInterval(timer)
    timer = null
    console.log('[Worker] billingWorker parado')
  }
}
