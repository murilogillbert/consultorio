import { prisma } from '../../../config/database'
import { CreateJobDto } from '../dtos/createJobDto'

export async function createJobService(dto: CreateJobDto) {
  return prisma.jobOpening.create({
    data: {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    },
  })
}
