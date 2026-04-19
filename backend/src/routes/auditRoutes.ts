import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'
import { AuditController } from '../modules/audit/controllers/auditController'

const r = Router()
const auditController = new AuditController()

r.get('/', ensureAuthenticated, ensureRole('ADMIN'), (req, res, next) => auditController.index(req, res, next))
r.get('/export', ensureAuthenticated, ensureRole('ADMIN'), (req, res, next) => auditController.export(req, res, next))

export default r
