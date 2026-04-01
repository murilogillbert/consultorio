import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { MetricsController } from '../modules/metrics/controllers/metricsController'

const r = Router()
const metricsController = new MetricsController()

r.get('/dashboard', ensureAuthenticated, metricsController.getDashboardData)
r.get('/billing', ensureAuthenticated, metricsController.getBillingData)
r.get('/professionals', ensureAuthenticated, metricsController.getProfessionalMetrics)
r.get('/services', ensureAuthenticated, metricsController.getServiceMetrics)
r.get('/marketing', ensureAuthenticated, metricsController.getMarketingMetrics)
r.get('/movement', ensureAuthenticated, metricsController.getMovementData)

export default r
