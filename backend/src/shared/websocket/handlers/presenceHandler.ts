import { Socket, Namespace } from 'socket.io'

// Mapa em memória: userId -> Set de socketIds ativos
const onlineUsers = new Map<string, Set<string>>()

/**
 * Registra o handler de presença (online/offline).
 * Emite 'presence:online' e 'presence:offline' para a sala da clínica.
 */
export function registerPresenceHandler(socket: Socket, ns: Namespace) {
  const userId  = socket.data.userId as string
  const clinicId = socket.data.clinicId as string | undefined

  // Marca usuário como online
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set())
  }
  const sockets = onlineUsers.get(userId)!
  sockets.add(socket.id)

  // Notifica a clínica (se soubermos o clinicId)
  if (clinicId) {
    socket.to(`clinic:${clinicId}`).emit('presence:online', { userId })
  }

  // Handler: cliente informa sua clínica após conectar
  socket.on('presence:join', (data: { clinicId: string }) => {
    if (!data?.clinicId) return
    socket.data.clinicId = data.clinicId
    socket.join(`clinic:${data.clinicId}`)
    // Anuncia presença para os outros membros da clínica
    socket.to(`clinic:${data.clinicId}`).emit('presence:online', { userId })
    // Envia a lista atual de online para quem acabou de entrar
    const currentOnline = Array.from(onlineUsers.keys()).filter(id => (onlineUsers.get(id)?.size ?? 0) > 0)
    socket.emit('presence:list', { online: currentOnline })
  })

  socket.on('disconnect', () => {
    sockets.delete(socket.id)
    if (sockets.size === 0) {
      onlineUsers.delete(userId)
      // Notifica offline para a clínica
      const cId = socket.data.clinicId as string | undefined
      if (cId) {
        socket.to(`clinic:${cId}`).emit('presence:offline', { userId })
      }
    }
  })
}

/** Utilitário para verificar se um usuário está online (usado por outros handlers) */
export function isUserOnline(userId: string): boolean {
  return (onlineUsers.get(userId)?.size ?? 0) > 0
}

/** Retorna todos os userIds online */
export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys()).filter(id => (onlineUsers.get(id)?.size ?? 0) > 0)
}
