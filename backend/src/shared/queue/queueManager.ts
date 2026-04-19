import { startReminderWorker,      stopReminderWorker      } from './workers/reminderWorker'
import { startNotificationWorker,  stopNotificationWorker  } from './workers/notificationWorker'
import { startAuditWorker,         stopAuditWorker         } from './workers/auditWorker'
import { startBillingWorker,       stopBillingWorker       } from './workers/billingWorker'
import { startGmailWatchWorker,    stopGmailWatchWorker    } from './workers/gmailWatchWorker'

/**
 * Inicia todos os workers da fila in-memory.
 * Chamado uma vez em server.ts durante o bootstrap.
 */
export function startQueueManager() {
  console.log('[Queue] Iniciando workers...')
  startReminderWorker()
  startNotificationWorker()
  startAuditWorker()
  startBillingWorker()
  startGmailWatchWorker()
  console.log('[Queue] Todos os workers ativos')
}

/**
 * Para todos os workers (útil em testes ou graceful shutdown).
 */
export function stopQueueManager() {
  stopReminderWorker()
  stopNotificationWorker()
  stopAuditWorker()
  stopBillingWorker()
  stopGmailWatchWorker()
  console.log('[Queue] Todos os workers parados')
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Queue] SIGTERM recebido — parando workers')
  stopQueueManager()
})

process.on('SIGINT', () => {
  console.log('[Queue] SIGINT recebido — parando workers')
  stopQueueManager()
})
