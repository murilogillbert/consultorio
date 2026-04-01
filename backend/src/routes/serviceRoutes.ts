import { Router } from 'express'
import { ServicesController } from '../modules/services/controllers/servicesController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const servicesController = new ServicesController()

// Public routes
r.get('/', servicesController.index)
r.get('/:id', servicesController.show)

// Admin-only routes
r.post('/', ensureAuthenticated, ensureRole(['ADMIN']), servicesController.create)
r.put('/:id', ensureAuthenticated, ensureRole(['ADMIN']), servicesController.update)
r.patch('/:id/archive', ensureAuthenticated, ensureRole(['ADMIN']), servicesController.archive)

export default r
