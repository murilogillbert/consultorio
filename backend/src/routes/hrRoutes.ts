import { Router } from 'express'
import { HrController } from '../modules/hr/controllers/hrController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const hr = new HrController()

// Public: list active openings + apply
r.get('/openings/active', hr.listActiveOpenings)
r.post('/candidacies', hr.createCandidacy)

// Admin: full CRUD
r.get('/openings', ensureAuthenticated, ensureRole(['ADMIN']), hr.listOpenings)
r.get('/openings/:id', ensureAuthenticated, ensureRole(['ADMIN']), hr.showOpening)
r.post('/openings', ensureAuthenticated, ensureRole(['ADMIN']), hr.createOpening)
r.put('/openings/:id', ensureAuthenticated, ensureRole(['ADMIN']), hr.updateOpening)
r.delete('/openings/:id', ensureAuthenticated, ensureRole(['ADMIN']), hr.deleteOpening)

r.get('/openings/:jobId/candidacies', ensureAuthenticated, ensureRole(['ADMIN']), hr.listCandidacies)
r.patch('/candidacies/:id/status', ensureAuthenticated, ensureRole(['ADMIN']), hr.updateCandidacyStatus)

export default r
