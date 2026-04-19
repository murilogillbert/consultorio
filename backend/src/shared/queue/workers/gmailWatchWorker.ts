/**
 * gmailWatchWorker.ts
 *
 * Periodically renews Gmail watch subscriptions before they expire.
 * Gmail watch subscriptions expire after 7 days; we renew every 6 days.
 *
 * On each tick the worker checks for clinics whose watch expires within
 * 48 hours (or has already expired) and renews them.
 */

import { setupGmailWatch, findClinicsNeedingWatchRenewal } from '../../../modules/messaging/channels/gmail/gmailWatchService'

const INTERVAL_MS = 6 * 24 * 60 * 60 * 1000 // 6 days

let timer: ReturnType<typeof setInterval> | null = null

async function renewExpiringWatches(): Promise<void> {
  console.log('[Gmail Watch Worker] Verificando watches a renovar...')

  let clinicIds: string[]
  try {
    clinicIds = await findClinicsNeedingWatchRenewal()
  } catch (err) {
    console.error('[Gmail Watch Worker] Erro ao buscar clínicas:', err)
    return
  }

  if (clinicIds.length === 0) {
    console.log('[Gmail Watch Worker] Nenhuma renovação necessária.')
    return
  }

  console.log(`[Gmail Watch Worker] Renovando ${clinicIds.length} watch(es)...`)

  for (const clinicId of clinicIds) {
    try {
      const result = await setupGmailWatch(clinicId)
      console.log(
        `[Gmail Watch Worker] Clínica ${clinicId} renovada. Expira em ${result.expiresAt.toISOString()}`,
      )
    } catch (err: any) {
      console.error(`[Gmail Watch Worker] Falha ao renovar watch para clínica ${clinicId}:`, err?.message)
    }
  }
}

export function startGmailWatchWorker(): void {
  if (timer) return
  console.log('[Worker] gmailWatchWorker iniciado (intervalo: 6 dias)')

  // Run once at startup to catch any expired or never-started watches
  renewExpiringWatches()

  timer = setInterval(renewExpiringWatches, INTERVAL_MS)
}

export function stopGmailWatchWorker(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
    console.log('[Worker] gmailWatchWorker parado')
  }
}
