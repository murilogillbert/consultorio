import { ConversationsRepository } from '../repositories/conversationsRepository'
import { AppError } from '../../../shared/errors/AppError'

const repo = new ConversationsRepository()

export async function getConversationService(conversationId: string) {
  const conversation = await repo.findById(conversationId)
  if (!conversation) throw new AppError('Conversa não encontrada', 404)
  return conversation
}
