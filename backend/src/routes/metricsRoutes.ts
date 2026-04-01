import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { MetricsController } from '../modules/metrics/controllers/metricsController'

const r = Router()
const metricsController = new MetricsController()

r.get('/dashboard', ensureAuthenticated, metricsController.getDashboardData)

export default r
