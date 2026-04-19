import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'
import { sendOtpEmail } from '../../../shared/services/emailService'

export async function forgotPasswordService(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Don't reveal if email exists
    return
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: otp, otpExpiresAt: expiresAt },
  })

  await sendOtpEmail(email, user.name, otp)
}
