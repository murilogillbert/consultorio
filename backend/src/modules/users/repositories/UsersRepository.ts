import { prisma } from '../../../config/database'
import { User, Prisma } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class UsersRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
  constructor() {
    super(prisma.user)
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email },
    })
  }

  async listWithRelations(): Promise<User[]> {
    return prisma.user.findMany({
      where: { active: true },
      include: {
        professional: true,
        patient: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
