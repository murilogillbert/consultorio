import { Request, Response } from 'express'
import { whatsappConfig } from '../../../../config/whatsapp'
import crypto from 'crypto'

export class WhatsappWebhookController {
  /**
   * Verification endpoint for Meta Webhook setup
   */
  async verify(req: Request, res: Response) {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === whatsappConfig.webhookVerifyToken) {
      console.log('WhatsApp Webhook Verified!')
      return res.status(200).send(challenge)
    }

    console.error('WhatsApp Webhook Verification Failed: Invalid Token')
    return res.status(403).send('Forbidden')
  }

  /**
   * Main endpoint for receiving WhatsApp notifications
   */
  async handle(req: Request, res: Response) {
    try {
        // Optional: Verify signature if WA_APP_SECRET is provided
        if (whatsappConfig.appSecret) {
            const signature = req.headers['x-hub-signature-256'] as string
            if (!signature) return res.status(401).send('No signature')

            const expectedSignature = 'sha256=' + 
                crypto.createHmac('sha256', whatsappConfig.appSecret)
                      .update(JSON.stringify(req.body))
                      .digest('hex')

            if (signature !== expectedSignature) {
                console.error('WhatsApp Webhook: Invalid Signature')
                return res.status(401).send('Invalid signature')
            }
        }

        const body = req.body

        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0]
            const changes = entry?.changes?.[0]
            const value = changes?.value

            if (value?.messages?.[0]) {
                const message = value.messages[0]
                const from = message.from
                const text = message.text?.body
                const timestamp = message.timestamp

                console.log(`Received Message from ${from}: ${text}`)

                // TODO: Save message to database (ExternalMessage table)
                // TODO: Emit event to Socket.io or background service to handle response
            }

            if (value?.statuses?.[0]) {
                const status = value.statuses[0]
                const id = status.id
                const s = status.status // delivered, read, sent, etc.
                console.log(`Message Status Update [${id}]: ${s}`)

                // TODO: Update InternalMessage status in DB
            }

            return res.status(200).send('OK')
        }

        return res.status(404).send('Not Found')
    } catch (err) {
        console.error('WhatsApp Webhook Error:', err)
        return res.status(500).send('Internal Server Error')
    }
  }
}
