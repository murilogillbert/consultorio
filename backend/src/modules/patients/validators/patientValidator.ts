import { AppError } from '../../../shared/errors/AppError'
import { CreatePatientDto } from '../dtos/createPatientDto'

export function validateCreatePatient(dto: Partial<CreatePatientDto>): void {
  if (!dto.userId && !(dto.name && dto.email)) {
    throw new AppError('Informe userId ou name + email', 400)
  }
  if (dto.cpf && !/^\d{11}$/.test(dto.cpf.replace(/\D/g, ''))) {
    throw new AppError('CPF inválido', 400)
  }
}
