import { prisma } from '../../../config/database'

export async function listInsuranceService(clinicId: string) {
  return prisma.insurancePlan.findMany({
    where: { clinicId, active: true },
    orderBy: { name: 'asc' },
  })
}
