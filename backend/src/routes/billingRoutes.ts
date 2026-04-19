import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { BillingController } from '../modules/billing/controllers/billingController'

const r = Router()
const billingController = new BillingController()

r.post('/charge', ensureAuthenticated, (req, res, next) => billingController.generateCharge(req, res, next))
r.post('/:id/refund', ensureAuthenticated, (req, res, next) => billingController.refund(req, res, next))
r.get('/report', ensureAuthenticated, (req, res, next) => billingController.report(req, res, next))
r.get('/delinquency', ensureAuthenticated, (req, res, next) => billingController.delinquency(req, res, next))
r.get('/payout', ensureAuthenticated, (req, res, next) => billingController.professionalPayout(req, res, next))

export default r
