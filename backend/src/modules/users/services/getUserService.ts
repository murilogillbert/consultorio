import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function getUserService(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, phone: true, createdAt: true },
  })
  if (!user) throw new AppError('Usuário não encontrado', 404)
  return user
}
