import { prisma } from '../../../config/database'
import { JobOpening, Prisma, JobCandidacy } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class JobOpeningRepository extends BaseRepository<JobOpening, Prisma.JobOpeningCreateInput, Prisma.JobOpeningUpdateInput> {
  constructor() {
    super(prisma.jobOpening)
  }

  async list(activeOnly = true): Promise<JobOpening[]> {
    return prisma.jobOpening.findMany({
      where: activeOnly ? { active: true } : {},
      orderBy: { createdAt: 'desc' },
      include: { candidacies: { select: { id: true } } }
    })
  }

  async listActive(): Promise<JobOpening[]> {
    return prisma.jobOpening.findMany({
      where: {
        active: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async findWithCandidacies(id: string): Promise<JobOpening | null> {
    return prisma.jobOpening.findUnique({
      where: { id },
      include: { candidacies: true }
    })
  }
}

export class JobCandidacyRepository extends BaseRepository<JobCandidacy, Prisma.JobCandidacyCreateInput, Prisma.JobCandidacyUpdateInput> {
  constructor() {
    super(prisma.jobCandidacy)
  }

  async findByJob(jobId: string): Promise<JobCandidacy[]> {
    return prisma.jobCandidacy.findMany({
      where: { jobOpeningId: jobId },
      orderBy: { createdAt: 'desc' }
    })
  }
}
