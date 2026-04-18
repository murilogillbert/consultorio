import { GenerateChargeDto } from '../dtos/generateChargeDto'

/**
 * Generates a PIX charge.
 * In production, integrate with Mercado Pago or Pagar.me.
 * Returns a static fake PIX code for sandbox/demo mode.
 */
export async function processPixService(dto: GenerateChargeDto): Promise<{
  pixCode: string
  gatewayId: string
}> {
  console.log(`[Billing] Gerando cobrança PIX: R$ ${dto.amount.toFixed(2)}`)

  // TODO: Integrar com gateway real (Mercado Pago / Pagar.me)
  const fakePixCode =
    '00020126580014BR.GOV.BCB.PIX0136' +
    Math.random().toString(36).substring(2, 38) +
    '5204000053039865406' +
    String(dto.amount.toFixed(2)).replace('.', '') +
    '5802BR5913Psicologia6009SaoPaulo62070503***6304'

  return {
    pixCode: fakePixCode,
    gatewayId: `pix_${Date.now()}`,
  }
}
