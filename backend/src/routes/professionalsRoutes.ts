import { Router } from 'express'
import { ProfessionalsController } from '../modules/professionals/controllers/ProfessionalsController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'

const r = Router()
const professionalsController = new ProfessionalsController()

r.get('/', professionalsController.index)
r.get('/:id', professionalsController.show)
r.post('/', ensureAuthenticated, professionalsController.create)
r.put('/:id', ensureAuthenticated, professionalsController.update)

export default r
