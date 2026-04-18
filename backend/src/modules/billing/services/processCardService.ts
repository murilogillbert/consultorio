import { GenerateChargeDto } from '../dtos/generateChargeDto'

/**
 * Generates a credit/debit card payment link.
 * In production, integrate with Mercado Pago or Pagar.me.
 */
export async function processCardService(dto: GenerateChargeDto): Promise<{
  paymentLinkUrl: string
  gatewayId: string
}> {
  console.log(`[Billing] Gerando link de cartão: R$ ${dto.amount.toFixed(2)}`)

  // TODO: Integrar com gateway real
  return {
    paymentLinkUrl: `https://checkout.example.com/${Date.now()}`,
    gatewayId: `card_${Date.now()}`,
  }
}
