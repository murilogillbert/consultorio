import { Router } from 'express'
import { ClinicController } from '../modules/clinic/controllers/ClinicController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const clinicController = new ClinicController()

// Clinic Routes (Public index/show)
r.get('/', clinicController.index)
r.get('/:id', clinicController.show)

// Admin level routes
r.post('/', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.create)
r.put('/:id', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.update)

export default r
