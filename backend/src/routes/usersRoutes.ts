import { Router } from 'express'
import { UsersController } from '../modules/users/controllers/UsersController'
import { SystemUsersController } from '../modules/users/controllers/systemUsersController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { ensureRole } from '../shared/middlewares/ensureRole'

const r = Router()
const usersController = new UsersController()
const systemUsersController = new SystemUsersController()

// Create User (Public for PATIENT registration)
r.post('/', usersController.create)

// Protected Routes (Admin only for list)
r.get('/', ensureAuthenticated, ensureRole(['ADMIN']), usersController.index)
r.get('/:id', ensureAuthenticated, usersController.show)

// System Users (Clinic Team Management)
r.get('/system/list', ensureAuthenticated, systemUsersController.index)
r.post('/system/create', ensureAuthenticated, systemUsersController.create)
r.put('/system/:id', ensureAuthenticated, systemUsersController.update)
r.delete('/system/:id', ensureAuthenticated, systemUsersController.remove)

export default r
