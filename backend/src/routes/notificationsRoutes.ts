import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { NotificationsController } from '../modules/notifications/controllers/notificationsController'

const r = Router()
const ctrl = new NotificationsController()

// Todas as rotas exigem autenticação (chamadas internas/admin)
r.post('/confirmation/:appointmentId', ensureAuthenticated, (req, res, next) => ctrl.sendConfirmation(req, res, next))
r.post('/reminders',                  ensureAuthenticated, (req, res, next) => ctrl.sendReminders(req, res, next))
r.post('/birthdays',                  ensureAuthenticated, (req, res, next) => ctrl.sendBirthdays(req, res, next))
r.post('/post-appointment',           ensureAuthenticated, (req, res, next) => ctrl.sendPostAppointment(req, res, next))

export default r
