import { prisma } from '../../../config/database'
import bcrypt from 'bcrypt'
import { CreateUserDto } from '../dtos/createUserDto'
import { AppError } from '../../../shared/errors/AppError'

export async function createUserService(dto: CreateUserDto) {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } })
  if (existing) throw new AppError('E-mail já cadastrado', 400)

  const passwordHash = await bcrypt.hash(dto.password, 10)
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

  // If clinicId provided, link to clinic as SystemUser
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
