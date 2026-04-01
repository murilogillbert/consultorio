import { prisma } from '../../../config/database'
import { User } from '@prisma/client'

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    })
  }
}
