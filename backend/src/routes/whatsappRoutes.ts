import { Router } from 'express'
import { WhatsappWebhookController } from '../modules/messaging/channels/whatsapp/whatsappWebhook'
import { GmailPubSubWebhookController } from '../modules/messaging/channels/gmail/gmailPubSubWebhook'
import { InstagramWebhookController } from '../modules/messaging/channels/instagram/instagramWebhook'
import { MercadoPagoWebhookController } from '../modules/billing/webhooks/mercadoPagoWebhook'

const r = Router()
const whatsappWebhook = new WhatsappWebhookController()
const gmailPubSubWebhook = new GmailPubSubWebhookController()
const instagramWebhook = new InstagramWebhookController()
const mercadoPagoWebhook = new MercadoPagoWebhookController()

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

/**
 * Instagram Direct Messages — GET verification + POST DM events
 * Meta calls GET once to verify the endpoint, then POSTs each DM.
 */
r.get('/instagram', (req, res) => instagramWebhook.verify(req, res))
r.post('/instagram', (req, res) => instagramWebhook.handle(req, res))

/**
 * Mercado Pago — POST payment status notifications
 */
r.post('/mercadopago', (req, res) => mercadoPagoWebhook.handle(req, res))

export default r
