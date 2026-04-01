import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { InternalChatController } from '../modules/messaging/controllers/internalChatController'

const r = Router()
const internalChatController = new InternalChatController()

r.get('/channels', ensureAuthenticated, internalChatController.index)
r.post('/channels', ensureAuthenticated, internalChatController.create)
r.put('/channels/:id', ensureAuthenticated, internalChatController.update)
r.delete('/channels/:id', ensureAuthenticated, internalChatController.remove)

export default r