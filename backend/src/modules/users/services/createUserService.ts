import { prisma } from '../../../config/database'
import bcrypt from 'bcrypt'
import { CreateUserDto } from '../dtos/createUserDto'

const DEFAULT_PASSWORD = '123456'

export async function createUserService(dto: CreateUserDto) {
  const rawPassword = dto.password?.trim() || DEFAULT_PASSWORD
  const passwordHash = await bcrypt.hash(rawPassword, 10)

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role ?? 'MEMBER',
      phone: dto.phone,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  if (dto.clinicId) {
    await prisma.systemUser.create({
      data: {
        clinicId: dto.clinicId,
        userId: user.id,
        role: dto.clinicRole ?? 'MEMBER',
        active: true,
      },
    })
  }

  return user
}
