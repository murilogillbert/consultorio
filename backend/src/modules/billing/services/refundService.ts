import { BillingRepository } from '../repositories/billingRepository'
import { AppError } from '../../../shared/errors/AppError'

const billingRepository = new BillingRepository()

export async function refundService(paymentId: string): Promise<void> {
  const payment = await billingRepository.findPaymentById(paymentId)
  if (!payment) {
    throw new AppError('Pagamento não encontrado', 404)
  }
  if (payment.status !== 'PAID') {
    throw new AppError('Somente pagamentos confirmados podem ser estornados', 400)
  }

  // TODO: chamar API do gateway para estornar
  console.log(`[Billing] Solicitando estorno do pagamento ${paymentId} (R$ ${payment.amount})`)

  await billingRepository.updatePayment(paymentId, { status: 'REFUNDED' })
}
