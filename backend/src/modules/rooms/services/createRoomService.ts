import { prisma } from '../../../config/database'
import { CreateRoomDto } from '../dtos/createRoomDto'

export async function createRoomService(dto: CreateRoomDto) {
  return prisma.room.create({
    data: { clinicId: dto.clinicId, name: dto.name, type: dto.type, capacity: dto.capacity },
  })
}
