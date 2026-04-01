import { Router } from 'express'
import { PatientsController } from '../modules/patients/controllers/PatientsController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const patientsController = new PatientsController()

// Patient Routes
r.post('/', ensureAuthenticated, patientsController.create)
r.get('/', ensureAuthenticated, ensureRole(['ADMIN', 'RECEPTIONIST']), patientsController.index)
r.get('/:id', ensureAuthenticated, patientsController.show)
r.put('/:id', ensureAuthenticated, patientsController.update)

export default r
