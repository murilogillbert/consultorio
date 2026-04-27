import { prisma } from '../../../config/database'
import { User } from '@prisma/client'

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email, active: true },
    })
  }

  async findUsersByEmail(email: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { email, active: true },
    })
  }
}
