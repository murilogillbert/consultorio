import { ConversationsRepository } from '../repositories/conversationsRepository'
import { AppError } from '../../../shared/errors/AppError'
import { emitToClinic } from '../../../shared/websocket/socketServer'

const repo = new ConversationsRepository()

export async function transferConversationService(conversationId: string, assignedToId: string) {
  const conversation = await repo.findById(conversationId)
  if (!conversation) throw new AppError('Conversa não encontrada', 404)

  const updated = await repo.update(conversationId, { assignedToId })
  emitToClinic(updated.clinicId, 'messaging:conversation_transferred', {
    conversationId,
    assignedToId,
  })
  return updated
}
