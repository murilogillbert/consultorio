/**
 * mercadoPagoWebhook.ts
 *
 * Handles Mercado Pago payment status notifications (IPNs / webhooks).
 *
 * MP sends a POST whenever a payment changes state (approved, rejected, etc.)
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 *
 * Signature validation uses the X-Signature header:
 *   X-Signature: ts=<timestamp>,v1=<HMAC-SHA256>
 *   Secret = mpWebhookSecret from IntegrationSettings (or env var MP_WEBHOOK_SECRET)
 */

import crypto from 'crypto'
import { Request, Response } from 'express'
import { prisma } from '../../../config/database'
import { mpGetPaymentStatus } from '../../../shared/providers/payment/mercadoPagoApi'

// Map MP payment statuses → our internal statuses
const MP_STATUS_MAP: Record<string, string> = {
  approved: 'PAID',
  rejected: 'FAILED',
  cancelled: 'FAILED',
  refunded: 'REFUNDED',
  charged_back: 'REFUNDED',
  pending: 'PENDING',
  in_process: 'PENDING',
  authorized: 'PENDING',
}

export class MercadoPagoWebhookController {
  async handle(req: Request, res: Response) {
    // Always respond 200 immediately — MP will retry on non-200 responses
    res.status(200).send('OK')

    try {
      const { type, data, action } = req.body

      // MP sends either `type: "payment"` (IPN style) or `action: "payment.updated"` (new style)
      const isPaymentEvent =
        type === 'payment' ||
        (typeof action === 'string' && action.startsWith('payment.'))

      if (!isPaymentEvent) return

      const gatewayId = String(data?.id ?? '')
      if (!gatewayId) return

      console.log(`[MercadoPago Webhook] Evento: ${action ?? type}, Payment ID: ${gatewayId}`)

      // Find the matching ConversationPayment and its clinic
      const payment = await prisma.conversationPayment.findFirst({
        where: { gatewayId },
        include: { conversation: { select: { clinicId: true } } },
      })

      if (!payment) {
        console.log(`[MercadoPago Webhook] Pagamento não encontrado para gatewayId ${gatewayId}`)
        return
      }

      const clinicId = (payment as any).conversation?.clinicId as string | undefined

      // Validate X-Signature (skip if no secret configured)
      const secret = await resolveWebhookSecret(clinicId)
      if (secret) {
        const xSignature = req.headers['x-signature'] as string | undefined
        const xRequestId = req.headers['x-request-id'] as string | undefined

        if (!validateSignature({ xSignature, xRequestId, gatewayId, secret })) {
          console.warn('[MercadoPago Webhook] Assinatura inválida — evento ignorado')
          return
        }
      }

      // Look up the actual payment status from MP API
      const accessToken = await resolveAccessToken(clinicId)
      if (!accessToken) {
        console.warn('[MercadoPago Webhook] Access token não encontrado — status não atualizado')
        return
      }

      const mpStatus = await mpGetPaymentStatus(accessToken, gatewayId)
      const internalStatus = MP_STATUS_MAP[mpStatus.status] ?? 'PENDING'

      await prisma.conversationPayment.update({
        where: { id: payment.id },
        data: {
          status: internalStatus as any,
          ...(internalStatus === 'PAID' ? { paidAt: new Date(mpStatus.date_approved ?? Date.now()) } : {}),
        },
      })

      console.log(
        `[MercadoPago Webhook] Pagamento ${payment.id} atualizado: ${payment.status} → ${internalStatus}`,
      )
    } catch (err) {
      console.error('[MercadoPago Webhook] Erro ao processar evento:', err)
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveAccessToken(clinicId?: string): Promise<string | null> {
  if (clinicId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { clinicId },
      select: { mpAccessTokenProd: true },
    })
    if (settings?.mpAccessTokenProd) return settings.mpAccessTokenProd
  }
  return process.env.MP_ACCESS_TOKEN ?? null
}

async function resolveWebhookSecret(clinicId?: string): Promise<string | null> {
  if (clinicId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { clinicId },
      select: { mpWebhookSecret: true },
    })
    if (settings?.mpWebhookSecret) return settings.mpWebhookSecret
  }
  return process.env.MP_WEBHOOK_SECRET ?? null
}

/**
 * Validate the X-Signature header sent by Mercado Pago.
 *
 * MP signs: `id:<paymentId>;request-id:<xRequestId>;ts:<timestamp>;`
 * using HMAC-SHA256 with the webhook secret.
 */
function validateSignature(params: {
  xSignature: string | undefined
  xRequestId: string | undefined
  gatewayId: string
  secret: string
}): boolean {
  const { xSignature, xRequestId, gatewayId, secret } = params
  if (!xSignature) return false

  try {
    // Parse "ts=...,v1=..."
    const parts = Object.fromEntries(
      xSignature.split(',').map(p => p.split('=').map(s => s.trim()) as [string, string]),
    )
    const ts = parts['ts']
    const v1 = parts['v1']
    if (!ts || !v1) return false

    const manifest = `id:${gatewayId};request-id:${xRequestId ?? ''};ts:${ts};`
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}
