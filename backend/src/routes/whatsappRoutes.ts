import { Router } from 'express'
import { WhatsappWebhookController } from '../modules/messaging/channels/whatsapp/whatsappWebhook'
import { GmailPubSubWebhookController } from '../modules/messaging/channels/gmail/gmailPubSubWebhook'

const r = Router()
const whatsappWebhook = new WhatsappWebhookController()
const gmailPubSubWebhook = new GmailPubSubWebhookController()

/**
 * WhatsApp — GET verification + POST incoming messages/statuses
 */
r.get('/whatsapp', (req, res) => whatsappWebhook.verify(req, res))
r.post('/whatsapp', (req, res) => whatsappWebhook.handle(req, res))

/**
 * Gmail / Google Pub/Sub — POST push notifications
 * Google Cloud pushes to POST /webhooks/gmail whenever a new email arrives.
 */
r.post('/gmail', (req, res) => gmailPubSubWebhook.handle(req, res))

export default r
