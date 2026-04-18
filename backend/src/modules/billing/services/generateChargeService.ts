import { BillingRepository } from '../repositories/billingRepository'
import { GenerateChargeDto } from '../dtos/generateChargeDto'
import { AppError } from '../../../shared/errors/AppError'

const billingRepository = new BillingRepository()

export async function generateChargeService(dto: GenerateChargeDto) {
  if (!dto.conversationId) {
    throw new AppError('conversationId é obrigatório', 400)
  }
  if (!dto.amount || dto.amount <= 0) {
    throw new AppError('Valor inválido', 400)
  }

  let result: { pixCode?: string; boletoUrl?: string; paymentLinkUrl?: string; gatewayId?: string }

  if (dto.method === 'PIX') {
    result = await import('./processPixService').then(m => m.processPixService(dto))
  } else if (dto.method === 'BOLETO') {
    result = await import('./processBoletoService').then(m => m.processBoletoService(dto))
  } else if (dto.method === 'CARD') {
    result = await import('./processCardService').then(m => m.processCardService(dto))
  } else {
    throw new AppError('Método de pagamento inválido', 400)
  }

  const payment = await billingRepository.createPayment({
    conversationId: dto.conversationId,
    amount: dto.amount,
    method: dto.method,
    status: 'PENDING',
    gatewayId: result.gatewayId,
    pixCode: result.pixCode,
    boletoUrl: result.boletoUrl,
    paymentLinkUrl: result.paymentLinkUrl,
  })

  return payment
}
