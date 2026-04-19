import { Router } from 'express'
import { ClinicController } from '../modules/clinic/controllers/ClinicController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const clinicController = new ClinicController()

// Clinic Routes (Public index/show)
r.get('/', clinicController.index)
r.get('/me', ensureAuthenticated, clinicController.getMe)
r.get('/:id', clinicController.show)

// Admin level routes
r.post('/', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.create)
r.put('/:id', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.update)
r.get('/settings/integrations', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.getIntegrations)
r.get('/:clinicId/settings/integrations', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.getIntegrations)
r.put('/:clinicId/settings/integrations', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.updateIntegrations)
r.post('/:clinicId/settings/integrations/:type/test', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.testIntegration)

// Gmail Pub/Sub watch management
r.post('/:clinicId/settings/integrations/gmail/watch', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.setupGmailWatch)
r.delete('/:clinicId/settings/integrations/gmail/watch', ensureAuthenticated, ensureRole(['ADMIN']), clinicController.stopGmailWatch)

export default r
