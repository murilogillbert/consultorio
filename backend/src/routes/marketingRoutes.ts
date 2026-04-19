import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { MarketingController } from '../modules/marketing/controllers/marketingController'

const r = Router()
const marketingController = new MarketingController()

r.post('/campaigns', ensureAuthenticated, (req, res, next) => marketingController.createCampaign(req, res, next))
r.get('/campaigns/:id/roi', ensureAuthenticated, (req, res, next) => marketingController.campaignRoi(req, res, next))
r.get('/export', ensureAuthenticated, (req, res, next) => marketingController.exportSegment(req, res, next))

export default r
