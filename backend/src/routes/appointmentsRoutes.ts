import { Router } from 'express'
import { AppointmentsController } from '../modules/appointments/controllers/appointmentsController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'

const r = Router()
const appointmentsController = new AppointmentsController()

r.get('/', ensureAuthenticated, appointmentsController.index)
r.post('/', ensureAuthenticated, appointmentsController.create)
r.put('/:id', ensureAuthenticated, appointmentsController.update)
r.patch('/:id/status', ensureAuthenticated, appointmentsController.updateStatus)
r.patch('/:id/confirmation', ensureAuthenticated, appointmentsController.updateConfirmation)
r.patch('/:id/cancel', ensureAuthenticated, appointmentsController.cancel)
r.patch('/:id/cancel-future', ensureAuthenticated, appointmentsController.cancelFuture)
r.delete('/:id/permanent', ensureAuthenticated, appointmentsController.deletePermanent)

export default r
