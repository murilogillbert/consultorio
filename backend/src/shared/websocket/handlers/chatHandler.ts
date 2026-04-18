import { Socket, Namespace } from 'socket.io'
import { prisma } from '../../../config/database'

interface SendMessagePayload {
  channelId: string
  content: string
  replyToId?: string
}

interface JoinChannelPayload {
  channelId: string
}

interface TypingPayload {
  channelId: string
  isTyping: boolean
}

async function ensureChannelMember(channelId: string, userId: string) {
  return prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  })
}

export function registerChatHandler(socket: Socket, _ns: Namespace) {
  const userId = socket.data.userId as string

  socket.on('chat:join', async (data: JoinChannelPayload) => {
    if (!data?.channelId) return

    const member = await ensureChannelMember(data.channelId, userId)
    if (!member) {
      socket.emit('chat:error', { message: 'Você não é membro deste canal' })
      return
    }

    socket.join(`channel:${data.channelId}`)
    console.log(`[Chat] userId=${userId} entrou no canal ${data.channelId}`)
  })

  socket.on('chat:leave', (data: JoinChannelPayload) => {
    if (!data?.channelId) return
    socket.leave(`channel:${data.channelId}`)
  })

  socket.on('chat:send', async (data: SendMessagePayload, ack?: (res: unknown) => void) => {
    try {
      if (!data?.channelId || !data?.content?.trim()) {
        socket.emit('chat:error', { message: 'channelId e content são obrigatórios' })
        return
      }

      const member = await ensureChannelMember(data.channelId, userId)
      if (!member) {
        socket.emit('chat:error', { message: 'Você não é membro deste canal' })
        return
      }

      const message = await prisma.internalMessage.create({
        data: {
          channelId: data.channelId,
          senderId: userId,
          content: data.content.trim(),
          type: 'TEXT',
          replyToId: data.replyToId ?? null,
        },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
        },
      })

      socket.to(`channel:${data.channelId}`).emit('chat:message', { message })

      if (ack) ack({ ok: true, message })
      else socket.emit('chat:message', { message })
    } catch (err) {
      console.error('[Chat] Erro ao enviar mensagem:', err)
      socket.emit('chat:error', { message: 'Erro interno ao enviar mensagem' })
    }
  })

  socket.on('chat:typing', async (data: TypingPayload) => {
    if (!data?.channelId) return

    const member = await ensureChannelMember(data.channelId, userId)
    if (!member) {
      socket.emit('chat:error', { message: 'Você não é membro deste canal' })
      return
    }

    socket.to(`channel:${data.channelId}`).emit('chat:typing', {
      userId,
      isTyping: Boolean(data.isTyping),
    })
  })
}
