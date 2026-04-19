import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'
import bcrypt from 'bcrypt'

export async function resetPasswordService(email: string, code: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.otpCode || user.otpCode !== code) {
    throw new AppError('Código inválido ou expirado', 400)
  }
  if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
    throw new AppError('Código expirado', 400)
  }
  if (newPassword.length < 6) {
    throw new AppError('A senha deve ter ao menos 6 caracteres', 400)
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, otpCode: null, otpExpiresAt: null },
  })
}
