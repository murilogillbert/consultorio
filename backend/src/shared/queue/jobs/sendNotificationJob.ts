import { sendBirthdayGreetingService } from '../../../modules/notifications/services/sendBirthdayGreetingService'
import { sendPostAppointmentService } from '../../../modules/notifications/services/sendPostAppointmentService'

/**
 * Job: disparar notificações automáticas (aniversários + pós-consulta).
 * Executado uma vez ao dia pelo notificationWorker.
 */
export async function sendNotificationJob(): Promise<void> {
  console.log('[Job] sendNotificationJob iniciado')
  try {
    await Promise.allSettled([
      sendBirthdayGreetingService(),
      sendPostAppointmentService(1),
    ])
    console.log('[Job] sendNotificationJob concluído')
  } catch (err) {
    console.error('[Job] sendNotificationJob falhou:', err)
  }
}
