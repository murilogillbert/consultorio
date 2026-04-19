import { GenerateChargeDto } from '../dtos/generateChargeDto'

/**
 * Generates a Boleto charge.
 * In production, integrate with Pagar.me or similar.
 */
export async function processBoletoService(dto: GenerateChargeDto): Promise<{
  boletoUrl: string
  gatewayId: string
}> {
  console.log(`[Billing] Gerando boleto: R$ ${dto.amount.toFixed(2)}`)

  // TODO: Integrar com gateway real
  return {
    boletoUrl: `https://boleto.example.com/${Date.now()}`,
    gatewayId: `boleto_${Date.now()}`,
  }
}