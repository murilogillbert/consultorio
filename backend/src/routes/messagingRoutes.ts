import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { InternalChatController } from '../modules/messaging/controllers/internalChatController'
import { InternalChatService } from '../modules/messaging/channels/internal/internalChatService'

const r = Router()
const internalChatController = new InternalChatController()
const internalChatService = new InternalChatService()

// Channel CRUD
r.get('/channels', ensureAuthenticated, internalChatController.index)
r.post('/channels', ensureAuthenticated, internalChatController.create)
r.put('/channels/:id', ensureAuthenticated, internalChatController.update)
r.delete('/channels/:id', ensureAuthenticated, internalChatController.remove)

// Internal channel messages
r.get('/channels/:id/messages', ensureAuthenticated, async (req, res, next) => {
  try {
    const messages = await internalChatService.listMessages(req.params.id)
    res.json(messages)
  } catch (err) { next(err) }
})

r.post('/channels/:id/messages', ensureAuthenticated, async (req, res, next) => {
  try {
    const { content, replyToId } = req.body
    const msg = await internalChatService.sendMessage(req.params.id, req.user.id, content, replyToId)
    res.status(201).json(msg)
  } catch (err) { next(err) }
})

// Patient conversations
r.get('/conversations', ensureAuthenticated, async (req, res, next) => {
  try {
    const { clinicId } = req.query as { clinicId?: string }
    const convos = await internalChatService.listConversations(clinicId)
    res.json(convos)
  } catch (err) { next(err) }
})

r.get('/conversations/:id/messages', ensureAuthenticated, async (req, res, next) => {
  try {
    const messages = await internalChatService.listConversationMessages(req.params.id)
    res.json(messages)
  } catch (err) { next(err) }
})

r.post('/conversations/:id/messages', ensureAuthenticated, async (req, res, next) => {
  try {
    const { content } = req.body
    const msg = await internalChatService.sendConversationMessage(req.params.id, content, req.user.id)
    res.status(201).json(msg)
  } catch (err) { next(err) }
})

export default r