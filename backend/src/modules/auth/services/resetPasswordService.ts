import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'
import bcrypt from 'bcrypt'

export async function resetPasswordService(email: string, code: string, newPassword: string): Promise<void> {
  if (newPassword.length < 6) {
    throw new AppError('A senha deve ter ao menos 6 caracteres', 400)
  }

  // Find the specific user who owns this OTP code — handles multiple users sharing an email.
  const user = await prisma.user.findFirst({
    where: { email, otpCode: code, active: true },
  })

  if (!user) {
    throw new AppError('Código inválido ou expirado', 400)
  }

  if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
    throw new AppError('Código expirado', 400)
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, otpCode: null, otpExpiresAt: null },
  })
}
