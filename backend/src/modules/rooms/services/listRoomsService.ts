import { prisma } from '../../../config/database'

export async function listRoomsService(clinicId: string) {
  return prisma.room.findMany({
    where: { clinicId, active: true },
    orderBy: { name: 'asc' },
  })
}
