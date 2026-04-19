import { AppError } from '../../../shared/errors/AppError'
import { LoginDto } from '../dtos/loginDto'
import { ResetPasswordDto } from '../dtos/resetPasswordDto'

export function validateLogin(dto: Partial<LoginDto>): void {
  if (!dto.email) throw new AppError('E-mail é obrigatório', 400)
  if (!dto.password) throw new AppError('Senha é obrigatória', 400)
}

export function validateResetPassword(dto: Partial<ResetPasswordDto>): void {
  if (!dto.email) throw new AppError('E-mail é obrigatório', 400)
  if (!dto.code) throw new AppError('Código é obrigatório', 400)
  if (!dto.newPassword || dto.newPassword.length < 6) {
    throw new AppError('A nova senha deve ter ao menos 6 caracteres', 400)
  }
}
