import { Socket, Namespace } from 'socket.io'
import { prisma } from '../../../config/database'

const onlineUsers = new Map<string, Set<string>>()

async function listOnlineUsersForClinics(clinicIds: string[]) {
  if (clinicIds.length === 0) {
    return []
  }

  const members = await prisma.systemUser.findMany({
    where: {
      clinicId: { in: clinicIds },
      active: true,
    },
    select: { userId: true },
  })

  const allowedUserIds = new Set(members.map((member) => member.userId))
  return Array.from(onlineUsers.keys()).filter((id) => {
    return allowedUserIds.has(id) && (onlineUsers.get(id)?.size ?? 0) > 0
  })
}

export function registerPresenceHandler(socket: Socket, _ns: Namespace) {
  const userId = socket.data.userId as string
  const clinicIds = ((socket.data.clinicIds as string[] | undefined) || []).filter(Boolean)

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set())
  }

  const sockets = onlineUsers.get(userId)!
  sockets.add(socket.id)

  for (const clinicId of clinicIds) {
    socket.to(`clinic:${clinicId}`).emit('presence:online', { userId, clinicId })
  }

  socket.on('presence:join', async (data?: { clinicId?: string }) => {
    const requestedClinicId = data?.clinicId
    const targetClinicIds = requestedClinicId
      ? clinicIds.filter((clinicId) => clinicId === requestedClinicId)
      : clinicIds

    if (requestedClinicId && targetClinicIds.length === 0) {
      socket.emit('presence:error', { message: 'Você não tem acesso a esta clínica' })
      return
    }

    const currentOnline = await listOnlineUsersForClinics(targetClinicIds)
    socket.emit('presence:list', {
      clinicIds: targetClinicIds,
      online: currentOnline,
    })
  })

  socket.on('disconnect', () => {
    sockets.delete(socket.id)
    if (sockets.size === 0) {
      onlineUsers.delete(userId)
      for (const clinicId of clinicIds) {
        socket.to(`clinic:${clinicId}`).emit('presence:offline', { userId, clinicId })
      }
    }
  })
}

export function isUserOnline(userId: string): boolean {
  return (onlineUsers.get(userId)?.size ?? 0) > 0
}

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys()).filter(id => (onlineUsers.get(id)?.size ?? 0) > 0)
}
