import { prisma } from '../../../config/database'
import { Schedule, Block, Prisma } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class SchedulesRepository extends BaseRepository<Schedule, Prisma.ScheduleCreateInput, Prisma.ScheduleUpdateInput> {
  constructor() {
    super(prisma.schedule)
  }

  async findByProfessional(professionalId: string): Promise<Schedule[]> {
    return prisma.schedule.findMany({
      where: { professionalId, active: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    })
  }

  async replaceSchedule(professionalId: string, slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>): Promise<Schedule[]> {
    // Remove all existing schedules for this professional
    await prisma.schedule.deleteMany({
      where: { professionalId }
    })

    // Create new schedules
    const created = await Promise.all(
      slots.map(slot =>
        prisma.schedule.create({
          data: {
            professional: { connect: { id: professionalId } },
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            active: true
          }
        })
      )
    )

    return created
  }
}

export class BlocksRepository extends BaseRepository<Block, Prisma.BlockCreateInput, Prisma.BlockUpdateInput> {
  constructor() {
    super(prisma.block)
  }

  async findByProfessionalInRange(professionalId: string, start: Date, end: Date): Promise<Block[]> {
    return prisma.block.findMany({
      where: {
        professionalId,
        startTime: { lte: end },
        endTime: { gte: start }
      },
      orderBy: { startTime: 'asc' }
    })
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
