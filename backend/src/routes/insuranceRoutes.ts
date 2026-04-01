import { Router } from 'express'
import { InsuranceController } from '../modules/insurance/controllers/insuranceController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'

const r = Router()
const insuranceController = new InsuranceController()

r.get('/', ensureAuthenticated, insuranceController.index)
r.post('/', ensureAuthenticated, insuranceController.create)
r.put('/:id', ensureAuthenticated, insuranceController.update)
r.delete('/:id', ensureAuthenticated, insuranceController.remove)

export default r
