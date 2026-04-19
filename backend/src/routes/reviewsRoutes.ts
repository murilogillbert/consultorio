import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ReviewsController } from '../modules/reviews/controllers/reviewsController'

const r = Router()
const reviewsController = new ReviewsController()

r.get('/', ensureAuthenticated, (req, res, next) => reviewsController.index(req, res, next))
r.post('/', (req, res, next) => reviewsController.create(req, res, next))  // público: paciente avalia sem login
r.get('/professional/:professionalId', (req, res, next) => reviewsController.byProfessional(req, res, next))

export default r
