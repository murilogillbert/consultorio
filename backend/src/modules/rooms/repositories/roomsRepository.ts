import { prisma } from '../../../config/database'
import { Room, Prisma } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class RoomsRepository extends BaseRepository<Room, Prisma.RoomCreateInput, Prisma.RoomUpdateInput> {
  constructor() {
    super(prisma.room)
  }

  async findByClinic(clinicId: string): Promise<Room[]> {
    return prisma.room.findMany({
      where: { clinicId, active: true },
      include: {
        appointments: {
          take: 5,
          where: { startTime: { gte: new Date() } },
          orderBy: { startTime: 'asc' }
        }
      }
    })
  }

  async findWithEquipments(id: string): Promise<Room | null> {
    return prisma.room.findUnique({
      where: { id },
      include: {
        currentEquipments: true,
        defaultEquipments: true
      }
    })
  }
}
