import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function deleteUserService(id: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new AppError('Usuário não encontrado', 404)

  // Soft delete
  await prisma.user.update({ where: { id }, data: { active: false } })
}
