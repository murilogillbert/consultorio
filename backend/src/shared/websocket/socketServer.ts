import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import { webSocketConfig } from '../../config/websocket'
import { socketAuthMiddleware } from './middleware/socketAuthMiddleware'
import { registerChatHandler } from './handlers/chatHandler'
import { registerNotificationHandler } from './handlers/notificationHandler'
import { registerPresenceHandler } from './handlers/presenceHandler'

let io: SocketServer | null = null

export function initSocket(httpServer: HttpServer): SocketServer {
  if (io) return io

  io = new SocketServer(httpServer, {
    cors: webSocketConfig.cors,
    pingTimeout: webSocketConfig.pingTimeout,
    pingInterval: webSocketConfig.pingInterval,
    transports: ['websocket', 'polling'],
  })

  const mainNs = io.of('/')
  mainNs.use(socketAuthMiddleware)

  mainNs.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string
    const role = socket.data.role as string
    const clinicIds = (socket.data.clinicIds as string[] | undefined) || []

    console.log(`[Socket] Conectado: userId=${userId} role=${role} clinics=${clinicIds.join(',') || '-'} socketId=${socket.id}`)

    socket.join(`user:${userId}`)

    for (const clinicId of clinicIds) {
      socket.join(`clinic:${clinicId}`)
    }

    registerChatHandler(socket, mainNs)
    registerNotificationHandler(socket, mainNs)
    registerPresenceHandler(socket, mainNs)

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Desconectado: userId=${userId} motivo=${reason}`)
    })
  })

  console.log('[Socket] Servidor Socket.io inicializado')
  return io
}

export function getIo(): SocketServer {
  if (!io) throw new Error('[Socket] Socket.io não inicializado. Chame initSocket() primeiro.')
  return io
}

export function emitToUser(userId: string, event: string, data: unknown) {
  try {
    getIo().of('/').to(`user:${userId}`).emit(event, data)
  } catch {
  }
}

export function emitToClinic(clinicId: string, event: string, data: unknown) {
  try {
    getIo().of('/').to(`clinic:${clinicId}`).emit(event, data)
  } catch {
  }
}
