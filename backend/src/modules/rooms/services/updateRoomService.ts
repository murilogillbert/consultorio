import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function updateRoomService(id: string, data: { name?: string; type?: string; active?: boolean }) {
  const room = await prisma.room.findUnique({ where: { id } })
  if (!room) throw new AppError('Sala não encontrada', 404)
  return prisma.room.update({ where: { id }, data })
}
