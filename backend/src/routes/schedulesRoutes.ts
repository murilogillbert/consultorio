import { Router } from 'express'
import { SchedulesController } from '../modules/schedules/controllers/schedulesController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'

const r = Router()
const schedulesController = new SchedulesController()

// Public: available slots for booking
r.get('/:professionalId/available', schedulesController.getAvailableSlots)

// Authenticated routes
r.get('/:professionalId', ensureAuthenticated, schedulesController.getSchedule)
r.put('/:professionalId', ensureAuthenticated, schedulesController.setSchedule)
r.post('/:professionalId/blocks', ensureAuthenticated, schedulesController.createBlock)
r.delete('/blocks/:blockId', ensureAuthenticated, schedulesController.deleteBlock)

export default r
