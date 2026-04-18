import { AppError } from '../../../shared/errors/AppError'
import { CreateServiceDto } from '../dtos/createServiceDto'

export function validateCreateService(dto: Partial<CreateServiceDto>): void {
  if (!dto.name?.trim()) throw new AppError('name é obrigatório', 400)
  if (!dto.duration || dto.duration <= 0) throw new AppError('duration deve ser positivo (em minutos)', 400)
  if (dto.price === undefined || dto.price < 0) throw new AppError('price deve ser >= 0', 400)
}
