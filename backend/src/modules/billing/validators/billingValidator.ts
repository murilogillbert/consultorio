import { AppError } from '../../../shared/errors/AppError'
import { GenerateChargeDto } from '../dtos/generateChargeDto'

export function validateGenerateCharge(dto: Partial<GenerateChargeDto>): void {
  if (!dto.amount || typeof dto.amount !== 'number' || dto.amount <= 0) {
    throw new AppError('amount deve ser um número positivo', 400)
  }
  if (!dto.method || !['PIX', 'CARD', 'BOLETO'].includes(dto.method)) {
    throw new AppError('method deve ser PIX, CARD ou BOLETO', 400)
  }
}