import { prisma } from '../../../config/database'
import { GenerateChargeDto } from '../dtos/generateChargeDto'
import { mpCreateCheckoutPreference } from '../../../shared/providers/payment/mercadoPagoApi'

/**
 * Generates a Mercado Pago Checkout preference for credit/debit card payments.
 *
 * Returns a hosted checkout URL (`init_point`) that the patient opens to
 * complete the payment in up to 12 installments.
 *
 * Falls back to a stub URL when no access token is configured.
 */
export async function processCardService(dto: GenerateChargeDto): Promise<{
  paymentLinkUrl: string
  gatewayId: string
}> {
  console.log(`[Billing] Gerando link de pagamento (cartão): R$ ${dto.amount.toFixed(2)}`)

  const accessToken = await resolveAccessToken(dto.clinicId)

  if (!accessToken) {
    console.warn('[Billing] Cartão: nenhum access token configurado, usando modo sandbox')
    return {
      paymentLinkUrl: `https://checkout.sandbox.com/${Date.now()}`,
      gatewayId: `card_sandbox_${Date.now()}`,
    }
  }

  const idempotencyKey = `card-${dto.conversationId ?? dto.appointmentId ?? Date.now()}-${dto.amount}`

  const result = await mpCreateCheckoutPreference({
    accessToken,
    amount: dto.amount,
    description: dto.description ?? 'Consulta médica',
    payerEmail: dto.patientEmail,
    notificationUrl: dto.notificationUrl,
    idempotencyKey,
  })

  return {
    paymentLinkUrl: result.paymentLinkUrl || result.sandboxUrl,
    gatewayId: result.gatewayId,
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
