import { Request, Response } from 'express'
import crypto from 'crypto'

/**
 * Pagar.me payment webhook handler.
 * Receives payment status updates from Pagar.me.
 * Docs: https://docs.pagar.me/reference/webhooks
 */
export class PagarmeWebhookController {
  async handle(req: Request, res: Response) {
    res.status(200).send('OK')

    try {
      // Validate signature if secret configured
      const secret = process.env.PAGARME_WEBHOOK_SECRET
      if (secret) {
        const signature = req.headers['x-hub-signature'] as string
        const expected =
          'sha1=' +
          crypto.createHmac('sha1', secret).update(JSON.stringify(req.body)).digest('hex')
        if (signature !== expected) {
          console.error('[Pagar.me Webhook] Assinatura inválida')
          return
        }
      }

      const { type, data } = req.body
      console.log(`[Pagar.me Webhook] Evento: ${type}`)

      if (!data?.id) return

      // Map Pagar.me status to internal status
      const statusMap: Record<string, string> = {
        paid: 'PAID',
        refunded: 'REFUNDED',
        refused: 'FAILED',
        pending: 'PENDING',
        waiting_payment: 'PENDING',
      }

      const newStatus = statusMap[data.status]
      if (!newStatus) return

      const { prisma } = await import('../../../config/database')
      await prisma.conversationPayment.updateMany({
        where: { gatewayId: String(data.id) },
        data: {
          status: newStatus,
          ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}),
        },
      })

      console.log(`[Pagar.me Webhook] Pagamento ${data.id} → ${newStatus}`)
    } catch (err) {
      console.error('[Pagar.me Webhook] Erro:', err)
    }
  }
}
