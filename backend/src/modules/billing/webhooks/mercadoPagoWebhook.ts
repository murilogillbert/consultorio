import { Request, Response } from 'express'
import { BillingRepository } from '../repositories/billingRepository'

const billingRepository = new BillingRepository()

/**
 * Mercado Pago payment webhook handler.
 * Receives payment status updates from Mercado Pago.
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export class MercadoPagoWebhookController {
  async handle(req: Request, res: Response) {
    // Always respond 200 immediately
    res.status(200).send('OK')

    try {
      const { type, data } = req.body

      if (type !== 'payment') return

      const gatewayId = String(data?.id)
      if (!gatewayId) return

      console.log(`[MercadoPago Webhook] Evento: ${type}, ID: ${gatewayId}`)

      // TODO: Validate X-Signature header using MP_WEBHOOK_SECRET for security

      // Find matching payment in our system
      const payments = await (async () => {
        const { prisma } = await import('../../../config/database')
        return prisma.conversationPayment.findMany({
          where: { gatewayId },
        })
      })()

      for (const payment of payments) {
        // TODO: Call MP API to get payment status and update accordingly
        // For now, we just log
        console.log(`[MercadoPago Webhook] Pagamento encontrado: ${payment.id}`)
      }
    } catch (err) {
      console.error('[MercadoPago Webhook] Erro:', err)
    }
  }
}
