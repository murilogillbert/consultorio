import { prisma } from '../../../config/database'
import { JobCandidacy, Prisma } from '@prisma/client'

export class ApplicationsRepository {
  async create(data: Prisma.JobCandidacyUncheckedCreateInput): Promise<JobCandidacy> {
    return prisma.jobCandidacy.create({ data })
  }

  async findByJob(jobOpeningId: string): Promise<JobCandidacy[]> {
    return prisma.jobCandidacy.findMany({
      where: { jobOpeningId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findAll(): Promise<JobCandidacy[]> {
    return prisma.jobCandidacy.findMany({
      include: { jobOpening: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateStatus(id: string, status: string, reviewedById?: string): Promise<JobCandidacy> {
    return prisma.jobCandidacy.update({
      where: { id },
      data: { status, reviewedById, reviewedAt: new Date() },
    })
  }
}
