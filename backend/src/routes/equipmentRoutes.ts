import { Router } from 'express'
import { EquipmentController } from '../modules/equipment/controllers/EquipmentController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const equipmentController = new EquipmentController()

// Equipment Routes
r.post('/', ensureAuthenticated, ensureRole(['ADMIN', 'RECEPTIONIST']), equipmentController.create)
r.get('/', ensureAuthenticated, equipmentController.index)
r.get('/:id', ensureAuthenticated, equipmentController.show)
r.put('/:id', ensureAuthenticated, ensureRole(['ADMIN', 'RECEPTIONIST']), equipmentController.update)
r.delete('/:id', ensureAuthenticated, ensureRole(['ADMIN']), equipmentController.delete)

export default r
