import { Router } from 'express'
import { AppointmentsController } from '../modules/appointments/controllers/appointmentsController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'

const r = Router()
const appointmentsController = new AppointmentsController()

r.get('/', ensureAuthenticated, appointmentsController.index)
r.post('/', ensureAuthenticated, appointmentsController.create)
r.patch('/:id/status', ensureAuthenticated, appointmentsController.updateStatus)
r.patch('/:id/cancel', ensureAuthenticated, appointmentsController.cancel)

export default r
