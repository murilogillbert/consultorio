import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function closeJobService(id: string) {
  const job = await prisma.jobOpening.findUnique({ where: { id } })
  if (!job) throw new AppError('Vaga não encontrada', 404)
  return prisma.jobOpening.update({ where: { id }, data: { active: false } })
}
