import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function addInternalNoteService(conversationId: string, authorId: string, content: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation) throw new AppError('Conversa não encontrada', 404)

  return prisma.conversationNote.create({
    data: { conversationId, authorId, content },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}
