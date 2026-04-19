import { prisma } from '../../../config/database'
import { BillingRepository } from '../repositories/billingRepository'
import { GenerateChargeDto } from '../dtos/generateChargeDto'
import { AppError } from '../../../shared/errors/AppError'

const billingRepository = new BillingRepository()

export async function generateChargeService(dto: GenerateChargeDto) {
  if (!dto.conversationId && !dto.appointmentId) {
    throw new AppError('conversationId ou appointmentId é obrigatório', 400)
  }
  if (!dto.amount || dto.amount <= 0) {
    throw new AppError('Valor inválido', 400)
  }

  // Resolve clinicId from the conversation so payment services can look up the
  // Mercado Pago access token stored in IntegrationSettings.
  let clinicId = dto.clinicId
  if (!clinicId && dto.conversationId) {
    const conv = await prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      select: { clinicId: true },
    })
    clinicId = conv?.clinicId
  }

  const enrichedDto: GenerateChargeDto = { ...dto, clinicId }

  let result: { pixCode?: string; boletoUrl?: string; paymentLinkUrl?: string; gatewayId?: string }

  if (dto.method === 'PIX') {
    result = await import('./processPixService').then(m => m.processPixService(enrichedDto))
  } else if (dto.method === 'BOLETO') {
    result = await import('./processBoletoService').then(m => m.processBoletoService(enrichedDto))
  } else if (dto.method === 'CARD') {
    result = await import('./processCardService').then(m => m.processCardService(enrichedDto))
  } else {
    throw new AppError('Método de pagamento inválido', 400)
  }

  const payment = await billingRepository.createPayment({
    ...(dto.conversationId ? { conversationId: dto.conversationId } : {}),
    amount: dto.amount,
    method: dto.method,
    status: 'PENDING',
    gatewayId: result.gatewayId,
    pixCode: result.pixCode,
    boletoUrl: result.boletoUrl,
    paymentLinkUrl: result.paymentLinkUrl,
  } as any)

  return payment
}
