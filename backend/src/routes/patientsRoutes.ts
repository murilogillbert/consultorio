import { Router } from 'express'
import { PatientsController } from '../modules/patients/controllers/PatientsController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const patientsController = new PatientsController()

// Patient Auth (OTP)
r.post('/auth/request-otp', patientsController.requestOtp)
r.post('/auth/verify-otp', patientsController.verifyOtp)

// Patient Routes
r.get('/my-appointments', ensureAuthenticated, patientsController.getMyAppointments)
r.post('/', ensureAuthenticated, patientsController.create)
r.get('/', ensureAuthenticated, ensureRole(['ADMIN', 'RECEPTIONIST']), patientsController.index)
r.get('/:id', ensureAuthenticated, patientsController.show)
r.put('/:id', ensureAuthenticated, patientsController.update)
r.delete('/:id', ensureAuthenticated, ensureRole(['ADMIN', 'RECEPTIONIST']), patientsController.delete)

export default r
