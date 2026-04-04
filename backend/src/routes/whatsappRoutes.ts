import { Router } from 'express'
import { WhatsappWebhookController } from '../modules/messaging/channels/whatsapp/whatsappWebhook'

const r = Router()
const whatsappWebhook = new WhatsappWebhookController()

/**
 * GET Webhook Verification
 * POST Receive messages and status notifications
 */
r.get('/whatsapp', (req, res) => whatsappWebhook.verify(req, res))
r.post('/whatsapp', (req, res) => whatsappWebhook.handle(req, res))

export default r
