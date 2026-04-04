import { prisma } from '../../../config/database'
import { Professional, Prisma, ProfessionalEducation, ProfessionalCertification, ProfessionalReview, Schedule, Block } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class ProfessionalsRepository extends BaseRepository<Professional, Prisma.ProfessionalCreateInput, Prisma.ProfessionalUpdateInput> {
  constructor() {
    super(prisma.professional)
  }

  async findWithDetails(id: string): Promise<Professional | null> {
    return prisma.professional.findUnique({
      where: { id },
      include: {
        user: true,
        services: { include: { service: true } },
        educations: true,
        certifications: true,
        schedules: true,
        blocks: true,
        reviews: { take: 5, orderBy: { createdAt: 'desc' } }
      }
    })
  }

  async listActive(): Promise<Professional[]> {
    return prisma.professional.findMany({
      where: { active: true },
      include: { user: true, schedules: true, services: { include: { service: true } } },
      orderBy: { user: { name: 'asc' } }
    })
  }
}

export class ProfessionalEducationRepository extends BaseRepository<ProfessionalEducation, Prisma.ProfessionalEducationCreateInput, Prisma.ProfessionalEducationUpdateInput> {
  constructor() {
    super(prisma.professionalEducation)
  }
}

export class ProfessionalCertificationRepository extends BaseRepository<ProfessionalCertification, Prisma.ProfessionalCertificationCreateInput, Prisma.ProfessionalCertificationUpdateInput> {
  constructor() {
    super(prisma.professionalCertification)
  }
}

export class ProfessionalReviewRepository extends BaseRepository<ProfessionalReview, Prisma.ProfessionalReviewCreateInput, Prisma.ProfessionalReviewUpdateInput> {
  constructor() {
    super(prisma.professionalReview)
  }
}

export class SchedulesRepository extends BaseRepository<Schedule, Prisma.ScheduleCreateInput, Prisma.ScheduleUpdateInput> {
  constructor() {
    super(prisma.schedule)
  }

  async findByProfessional(professionalId: string): Promise<Schedule[]> {
    return prisma.schedule.findMany({
      where: { professionalId, active: true },
      orderBy: { dayOfWeek: 'asc' }
    })
  }
}

export class BlocksRepository extends BaseRepository<Block, Prisma.BlockCreateInput, Prisma.BlockUpdateInput> {
  constructor() {
    super(prisma.block)
  }

  async findActiveByProfessional(professionalId: string): Promise<Block[]> {
    return prisma.block.findMany({
      where: {
        professionalId,
        endTime: { gte: new Date() }
      },
      orderBy: { startTime: 'asc' }
    })
  }
}
