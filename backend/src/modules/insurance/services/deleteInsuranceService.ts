import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function deleteInsuranceService(id: string) {
  const plan = await prisma.insurancePlan.findUnique({ where: { id } })
  if (!plan) throw new AppError('Plano não encontrado', 404)
  // Soft delete
  await prisma.insurancePlan.update({ where: { id }, data: { active: false } })
}