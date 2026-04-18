import { Request, Response, NextFunction } from 'express'
import { sendConfirmationService } from '../services/sendConfirmationService'
import { sendReminderService } from '../services/sendReminderService'
import { sendBirthdayGreetingService } from '../services/sendBirthdayGreetingService'
import { sendPostAppointmentService } from '../services/sendPostAppointmentService'
import { requireSingleString } from '../../../shared/utils/requestUtils'

export class NotificationsController {
  /**
   * POST /api/notifications/confirmation/:appointmentId
   * Envia confirmação de agendamento manualmente
   */
  async sendConfirmation(req: Request, res: Response, next: NextFunction) {
    try {
      const appointmentId = requireSingleString(req.params.appointmentId, 'appointmentId')
      await sendConfirmationService(appointmentId)
      res.json({ ok: true, message: 'Confirmação enviada com sucesso' })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/notifications/reminders
   * Dispara lembretes para agendamentos nas próximas N horas
   * Body: { withinHours?: number } (padrão: 24)
   */
  async sendReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const withinHours = Number(req.body.withinHours) || 24
      await sendReminderService(withinHours)
      res.json({ ok: true, message: `Lembretes disparados para as próximas ${withinHours}h` })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/notifications/birthdays
   * Envia parabéns para todos que fazem aniversário hoje
   */
  async sendBirthdays(req: Request, res: Response, next: NextFunction) {
    try {
      await sendBirthdayGreetingService()
      res.json({ ok: true, message: 'Mensagens de aniversário enviadas' })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/notifications/post-appointment
   * Envia mensagem pós-consulta para atendimentos concluídos
   * Body: { hoursAfter?: number } (padrão: 1)
   */
  async sendPostAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const hoursAfter = Number(req.body.hoursAfter) || 1
      await sendPostAppointmentService(hoursAfter)
      res.json({ ok: true, message: 'Mensagens pós-consulta enviadas' })
    } catch (err) {
      next(err)
    }
  }
}
