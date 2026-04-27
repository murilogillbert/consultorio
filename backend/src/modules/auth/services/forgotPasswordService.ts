import { prisma } from '../../../config/database'
import { sendOtpEmail } from '../../../shared/services/emailService'

export async function forgotPasswordService(email: string): Promise<void> {
  // Multiple users can share the same email — find the first active one.
  const user = await prisma.user.findFirst({ where: { email, active: true } })
  if (!user) {
    // Don't reveal whether the email exists
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
