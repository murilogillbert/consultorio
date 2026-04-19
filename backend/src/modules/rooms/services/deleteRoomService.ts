import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function deleteRoomService(id: string) {
  const room = await prisma.room.findUnique({ where: { id } })
  if (!room) throw new AppError('Sala não encontrada', 404)
  await prisma.room.update({ where: { id }, data: { active: false } })
  return room
}
