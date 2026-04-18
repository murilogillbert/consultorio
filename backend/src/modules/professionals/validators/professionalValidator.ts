import { AppError } from '../../../shared/errors/AppError'
import { CreateProfessionalDto } from '../dtos/createProfessionalDto'

export function validateCreateProfessional(dto: Partial<CreateProfessionalDto>): void {
  if (!dto.userId) throw new AppError('userId é obrigatório', 400)
  if (dto.commissionPct !== undefined && (dto.commissionPct < 0 || dto.commissionPct > 100)) {
    throw new AppError('commissionPct deve estar entre 0 e 100', 400)
  }
}
