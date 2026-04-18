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

/**
 * Handler de chat interno (canais da equipe).
 *
 * Eventos recebidos (cliente → server):
 *   chat:join       { channelId }         — entra na sala do canal
 *   chat:leave      { channelId }         — sai da sala
 *   chat:send       { channelId, content, replyToId? } — envia mensagem
 *   chat:typing     { channelId, isTyping } — indica digitação
 *
 * Eventos emitidos (server → cliente):
 *   chat:message    { message }           — nova mensagem no canal
 *   chat:typing     { userId, isTyping }  — alguém está digitando
 *   chat:error      { message }           — erro de validação
 */
export function registerChatHandler(socket: Socket, _ns: Namespace) {
  const userId = socket.data.userId as string

  // ── Entrar num canal ──────────────────────────────────────────────
  socket.on('chat:join', async (data: JoinChannelPayload) => {
    if (!data?.channelId) return
    socket.join(`channel:${data.channelId}`)
    console.log(`[Chat] userId=${userId} entrou no canal ${data.channelId}`)
  })

  // ── Sair de um canal ─────────────────────────────────────────────
  socket.on('chat:leave', (data: JoinChannelPayload) => {
    if (!data?.channelId) return
    socket.leave(`channel:${data.channelId}`)
  })

  // ── Enviar mensagem ───────────────────────────────────────────────
  socket.on('chat:send', async (data: SendMessagePayload, ack?: (res: unknown) => void) => {
    try {
      if (!data?.channelId || !data?.content?.trim()) {
        socket.emit('chat:error', { message: 'channelId e content são obrigatórios' })
        return
      }

      // Verifica se o usuário é membro do canal
      const member = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId: data.channelId, userId } },
      })
      if (!member) {
        socket.emit('chat:error', { message: 'Você não é membro deste canal' })
        return
      }

      // Persiste a mensagem
      const message = await prisma.internalMessage.create({
        data: {
          channelId: data.channelId,
          senderId:  userId,
          content:   data.content.trim(),
          type:      'TEXT',
          replyToId: data.replyToId ?? null,
        },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
        },
      })

      // Emite para todos na sala do canal (inclusive o remetente)
      socket.to(`channel:${data.channelId}`).emit('chat:message', { message })

      // ACK para o remetente com a mensagem já persistida
      if (ack) ack({ ok: true, message })
      else socket.emit('chat:message', { message })

    } catch (err) {
      console.error('[Chat] Erro ao enviar mensagem:', err)
      socket.emit('chat:error', { message: 'Erro interno ao enviar mensagem' })
    }
  })

  // ── Indicador de digitação ────────────────────────────────────────
  socket.on('chat:typing', (data: TypingPayload) => {
    if (!data?.channelId) return
    socket.to(`channel:${data.channelId}`).emit('chat:typing', {
      userId,
      isTyping: Boolean(data.isTyping),
    })
  })
}
