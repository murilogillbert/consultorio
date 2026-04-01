import { ExternalMessageRepository } from '../repositories/messagesRepository'
import { ExternalMessage, Prisma } from '@prisma/client'
import { AppError } from '../../../shared/errors/AppError'

export class ExternalMessageService {
  private messagesRepository: ExternalMessageRepository

  constructor(messagesRepository: ExternalMessageRepository) {
    this.messagesRepository = messagesRepository
  }

  async executeCreate(data: Prisma.ExternalMessageUncheckedCreateInput): Promise<ExternalMessage | null> {
    // [Advanced Logic] Deduplication by channelMessageId
    if (data.channelMessageId) {
      const exists = await this.messagesRepository.existsByChannelId(data.channelMessageId)
      if (exists) {
        // Silently skip or log - message already exists
        console.log(`[Messaging] Skipping duplicate message: ${data.channelMessageId}`)
        return null
      }
    }

    // JSON handling for metadata if provided as object
    if (typeof data.metadata === 'object') {
      data.metadata = JSON.stringify(data.metadata)
    }

    return this.messagesRepository.create(data as any)
  }

  async executeGetByConversation(conversationId: string): Promise<ExternalMessage[]> {
    return this.messagesRepository.list() // Simplified for now, should filter by conversationId
  }
}
