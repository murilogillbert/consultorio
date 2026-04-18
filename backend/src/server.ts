import http from 'http'
import app from './app'
import { PrismaClient } from '@prisma/client'
import { initSocket } from './shared/websocket/socketServer'
import { startQueueManager } from './shared/queue/queueManager'

const port = process.env.PORT || 3333
export const prisma = new PrismaClient()

async function bootstrap() {
  try {
    await prisma.$connect()
    console.log('[DB] Banco de dados conectado')

    // Cria o servidor HTTP a partir do Express (necessário para Socket.io)
    const httpServer = http.createServer(app)

    // Inicializa Socket.io
    initSocket(httpServer)

    // Inicia a fila de jobs in-memory
    startQueueManager()

    httpServer.listen(port, () => {
      console.log(`[Server] Rodando na porta ${port}`)
    })
  } catch (err) {
    console.error('[Server] Falha ao iniciar:', err)
    process.exit(1)
  }
}

bootstrap()
