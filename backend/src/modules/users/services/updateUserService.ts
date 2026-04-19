import { prisma } from '../../../config/database'
import { UpdateUserDto } from '../dtos/updateUserDto'
import { AppError } from '../../../shared/errors/AppError'

export async function updateUserService(id: string, dto: UpdateUserDto) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new AppError('Usuário não encontrado', 404)

  return prisma.user.update({
    where: { id },
    data: dto,
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, phone: true, createdAt: true },
  })
}
