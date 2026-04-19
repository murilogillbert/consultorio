import { PaymentProvider } from './paymentProvider'

/**
 * Mercado Pago payment provider.
 * Actual API calls are in billing/services/process*Service.ts
 * This is the interface wrapper for future DI refactoring.
 */
export class MercadoPagoProvider implements PaymentProvider {
  constructor(private accessToken: string) {}

  async createPixCharge(params: { amount: number; description?: string }) {
    return { pixCode: `pix_stub_${Date.now()}`, gatewayId: `mp_${Date.now()}` }
  }

  async createBoleto(params: { amount: number; customerName: string; customerCpf: string }) {
    return { boletoUrl: `https://boleto.mp.com/${Date.now()}`, gatewayId: `mp_${Date.now()}` }
  }

  async createCardLink(params: { amount: number; description?: string }) {
    return { paymentLinkUrl: `https://checkout.mp.com/${Date.now()}`, gatewayId: `mp_${Date.now()}` }
  }

  async refund(_gatewayId: string) {
    // TODO: implement MP refund
  }
}
