import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import { webSocketConfig } from '../../config/websocket'
import { socketAuthMiddleware } from './middleware/socketAuthMiddleware'
import { registerChatHandler } from './handlers/chatHandler'
import { registerNotificationHandler } from './handlers/notificationHandler'
import { registerPresenceHandler } from './handlers/presenceHandler'

let io: SocketServer | null = null

/**
 * Inicializa o servidor Socket.io e registra todos os handlers.
 * Deve ser chamado UMA VEZ em server.ts, passando o httpServer.
 */
export function initSocket(httpServer: HttpServer): SocketServer {
  if (io) return io

  io = new SocketServer(httpServer, {
    cors: webSocketConfig.cors,
    pingTimeout: webSocketConfig.pingTimeout,
    pingInterval: webSocketConfig.pingInterval,
    transports: ['websocket', 'polling'],
  })

  // Namespace principal (autenticado)
  const mainNs = io.of('/')
  mainNs.use(socketAuthMiddleware)

  mainNs.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string
    const role   = socket.data.role   as string

    console.log(`[Socket] Conectado: userId=${userId} role=${role} socketId=${socket.id}`)

    // Sala pessoal — qualquer evento direcionado a um usuário específico
    socket.join(`user:${userId}`)

    // Registra handlers por domínio
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

/**
 * Retorna a instância do Socket.io (após initSocket).
 * Use para emitir eventos de dentro de services/controllers.
 */
export function getIo(): SocketServer {
  if (!io) throw new Error('[Socket] Socket.io não inicializado. Chame initSocket() primeiro.')
  return io
}

/**
 * Emite um evento para um usuário específico (via sala pessoal).
 */
export function emitToUser(userId: string, event: string, data: unknown) {
  try {
    getIo().of('/').to(`user:${userId}`).emit(event, data)
  } catch {
    // Socket não inicializado em contexto de teste — ignora silenciosamente
  }
}

/**
 * Emite um evento para todos os membros de uma clínica.
 */
export function emitToClinic(clinicId: string, event: string, data: unknown) {
  try {
    getIo().of('/').to(`clinic:${clinicId}`).emit(event, data)
  } catch {
    // Idem
  }
}
