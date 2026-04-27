import { AppError } from '../../../shared/errors/AppError'
import { CreateUserDto } from '../dtos/createUserDto'

export function validateCreateUser(dto: Partial<CreateUserDto>): void {
  if (!dto.name?.trim()) throw new AppError('name é obrigatório', 400)
  if (!dto.email?.trim()) throw new AppError('email é obrigatório', 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
    throw new AppError('email inválido', 400)
  }
  // Password is optional — a default of 123456 is applied when not provided
  if (dto.password !== undefined && dto.password !== '' && dto.password.length < 6) {
    throw new AppError('password deve ter ao menos 6 caracteres', 400)
  }
}
