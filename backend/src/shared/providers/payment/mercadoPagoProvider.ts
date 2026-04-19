import { PaymentProvider } from './paymentProvider'
import { mpCreatePix, mpCreateBoleto, mpCreateCheckoutPreference } from './mercadoPagoApi'

/**
 * Mercado Pago payment provider.
 * Wraps the low-level MP API helpers behind the shared PaymentProvider interface.
 */
export class MercadoPagoProvider implements PaymentProvider {
  constructor(private accessToken: string) {}

  async createPixCharge(params: { amount: number; description?: string; payerEmail?: string }) {
    const result = await mpCreatePix({
      accessToken: this.accessToken,
      amount: params.amount,
      description: params.description,
      payerEmail: params.payerEmail ?? 'paciente@clinica.com',
      idempotencyKey: `pix-provider-${Date.now()}-${params.amount}`,
    })
    return { pixCode: result.pixCode, gatewayId: result.gatewayId }
  }

  async createBoleto(params: { amount: number; customerName: string; customerCpf: string; customerEmail?: string }) {
    const nameParts = params.customerName.trim().split(' ')
    const result = await mpCreateBoleto({
      accessToken: this.accessToken,
      amount: params.amount,
      payerEmail: params.customerEmail ?? 'paciente@clinica.com',
      payerFirstName: nameParts[0] ?? 'Paciente',
      payerLastName: nameParts.slice(1).join(' ') || 'Clínica',
      payerCpf: params.customerCpf.replace(/\D/g, ''),
      idempotencyKey: `boleto-provider-${Date.now()}-${params.amount}`,
    })
    return { boletoUrl: result.boletoUrl, gatewayId: result.gatewayId }
  }

  async createCardLink(params: { amount: number; description?: string; payerEmail?: string }) {
    const result = await mpCreateCheckoutPreference({
      accessToken: this.accessToken,
      amount: params.amount,
      description: params.description ?? 'Pagamento via clínica',
      payerEmail: params.payerEmail,
      idempotencyKey: `card-provider-${Date.now()}-${params.amount}`,
    })
    return { paymentLinkUrl: result.paymentLinkUrl || result.sandboxUrl, gatewayId: result.gatewayId }
  }

  async refund(_gatewayId: string) {
    // MP refund: POST /v1/payments/{id}/refunds
    // Requires a separate access token scope — left as TODO for MVP
    console.warn('[MercadoPago] Refund via provider not yet implemented. Use the billing refundService instead.')
  }
}
