import { prisma } from '../../../config/database'

export async function listJobsService(clinicId?: string, activeOnly = false) {
  return prisma.jobOpening.findMany({
    where: {
      ...(clinicId ? { clinicId } : {}),
      ...(activeOnly ? { active: true } : {}),
    },
    include: { _count: { select: { candidacies: true } } },
    orderBy: { createdAt: 'desc' },
  })
}
