import { Router } from 'express'
import { RoomsController } from '../modules/rooms/controllers/roomsController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const roomsController = new RoomsController()

r.get('/', ensureAuthenticated, roomsController.index)
r.get('/:id', ensureAuthenticated, roomsController.show)
r.post('/', ensureAuthenticated, ensureRole(['ADMIN']), roomsController.create)
r.put('/:id', ensureAuthenticated, ensureRole(['ADMIN']), roomsController.update)
r.delete('/:id', ensureAuthenticated, ensureRole(['ADMIN']), roomsController.remove)

export default r
