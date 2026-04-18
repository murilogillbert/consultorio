import { Router } from 'express'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'
import { InternalChatController } from '../modules/messaging/controllers/internalChatController'
import { InternalChatService } from '../modules/messaging/channels/internal/internalChatService'
import { getFirstString, requireSingleString } from '../shared/utils/requestUtils'

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
    const channelId = requireSingleString(req.params.id, 'id')
    const messages = await internalChatService.listMessages(channelId)
    res.json(messages)
  } catch (err) { next(err) }
})

r.post('/channels/:id/messages', ensureAuthenticated, async (req, res, next) => {
  try {
    const { content, replyToId } = req.body
    const channelId = requireSingleString(req.params.id, 'id')
    const msg = await internalChatService.sendMessage(channelId, req.user.id, content, replyToId)
    res.status(201).json(msg)
  } catch (err) { next(err) }
})

// Patient conversations
r.get('/conversations', ensureAuthenticated, async (req, res, next) => {
  try {
    const clinicId = getFirstString(req.query.clinicId)
    const convos = await internalChatService.listConversations(clinicId)
    res.json(convos)
  } catch (err) { next(err) }
})

r.get('/conversations/:id/messages', ensureAuthenticated, async (req, res, next) => {
  try {
    const conversationId = requireSingleString(req.params.id, 'id')
    const messages = await internalChatService.listConversationMessages(conversationId)
    res.json(messages)
  } catch (err) { next(err) }
})

r.post('/conversations/:id/messages', ensureAuthenticated, async (req, res, next) => {
  try {
    const { content } = req.body
    const conversationId = requireSingleString(req.params.id, 'id')
    const msg = await internalChatService.sendConversationMessage(conversationId, content, req.user.id)
    res.status(201).json(msg)
  } catch (err) { next(err) }
})

r.patch('/conversations/:id/read', ensureAuthenticated, async (req, res, next) => {
  try {
    const conversationId = requireSingleString(req.params.id, 'id')
    await internalChatService.markConversationAsRead(conversationId)
    res.status(200).json({ ok: true })
  } catch (err) { next(err) }
})

export default r
