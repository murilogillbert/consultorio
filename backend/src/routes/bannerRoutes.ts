import { Router } from 'express'
import { BannerController } from '../modules/clinic/controllers/BannerController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const bannerController = new BannerController()

// Public
r.get('/public/:clinicId', bannerController.listPublic)

// Admin
r.get('/', ensureAuthenticated, ensureRole(['ADMIN']), bannerController.index)
r.post('/', ensureAuthenticated, ensureRole(['ADMIN']), bannerController.create)
r.put('/:id', ensureAuthenticated, ensureRole(['ADMIN']), bannerController.update)
r.delete('/:id', ensureAuthenticated, ensureRole(['ADMIN']), bannerController.delete)

export default r
