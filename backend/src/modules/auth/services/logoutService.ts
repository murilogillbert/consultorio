import { prisma } from '../../../config/database'

/**
 * Logout: in a JWT setup there is no server-side session to destroy.
 * This service can be extended to invalidate refresh tokens or add to a
 * token blocklist if that feature is needed later.
 */
export async function logoutService(userId: string): Promise<void> {
  // Optional: clear OTP codes on logout
  await prisma.user.updateMany({
    where: { id: userId },
    data: { otpCode: null, otpExpiresAt: null },
  })
}
