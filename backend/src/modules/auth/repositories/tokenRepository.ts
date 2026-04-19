import { prisma } from '../../../config/database'

/**
 * Token repository — placeholder for a future token blocklist or
 * refresh token store. Currently JWT auth is stateless.
 */
export class TokenRepository {
  async invalidate(_token: string): Promise<void> {
    // TODO: store invalidated tokens in a Redis set or DB table
    // for now this is a no-op as tokens expire naturally
  }

  async isInvalidated(_token: string): Promise<boolean> {
    return false
  }
}
