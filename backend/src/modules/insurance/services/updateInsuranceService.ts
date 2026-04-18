import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function updateInsuranceService(id: string, data: { name?: string; documentsRequired?: string; active?: boolean }) {
  const plan = await prisma.insurancePlan.findUnique({ where: { id } })
  if (!plan) throw new AppError('Plano não encontrado', 404)
  return prisma.insurancePlan.update({ where: { id }, data })
}
