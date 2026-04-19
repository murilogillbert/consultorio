import { PaymentProvider } from './paymentProvider'

/**
 * Pagar.me payment provider stub.
 */
export class PagarmeProvider implements PaymentProvider {
  constructor(private apiKey: string) {}

  async createPixCharge(params: { amount: number; description?: string }) {
    return { pixCode: `pix_pagarme_${Date.now()}`, gatewayId: `pagarme_${Date.now()}` }
  }

  async createBoleto(params: { amount: number; customerName: string; customerCpf: string }) {
    return { boletoUrl: `https://boleto.pagarme.com/${Date.now()}`, gatewayId: `pagarme_${Date.now()}` }
  }

  async createCardLink(params: { amount: number; description?: string }) {
    return { paymentLinkUrl: `https://checkout.pagarme.com/${Date.now()}`, gatewayId: `pagarme_${Date.now()}` }
  }

  async refund(_gatewayId: string) {}
}
