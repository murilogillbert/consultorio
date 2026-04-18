import { sendReminderService } from '../../../modules/notifications/services/sendReminderService'

/**
 * Job: disparar lembretes para consultas nas próximas 24h.
 * Executado periodicamente pelo reminderWorker.
 */
export async function sendReminderJob(): Promise<void> {
  console.log('[Job] sendReminderJob iniciado')
  try {
    await sendReminderService(24)
    console.log('[Job] sendReminderJob concluído')
  } catch (err) {
    console.error('[Job] sendReminderJob falhou:', err)
  }
}
