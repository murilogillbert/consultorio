import { prisma } from '../../../config/database'
import { 
  InternalChannel, Prisma, ChannelMember, InternalMessage, MessageRead, PinnedMessage, 
  Contact, Conversation, ExternalMessage, ExternalMessageAttachment, ConversationNote, ConversationPayment 
} from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

// --- Internal Messaging ---

export class InternalChannelRepository extends BaseRepository<InternalChannel, Prisma.InternalChannelCreateInput, Prisma.InternalChannelUpdateInput> {
  constructor() {
    super(prisma.internalChannel)
  }

  async findByClinic(clinicId: string): Promise<InternalChannel[]> {
    return prisma.internalChannel.findMany({
      where: { clinicId, active: true },
      include: { members: { include: { user: true } } }
    })
  }
}

export class InternalMessageRepository extends BaseRepository<InternalMessage, Prisma.InternalMessageCreateInput, Prisma.InternalMessageUpdateInput> {
  constructor() {
    super(prisma.internalMessage)
  }

  async findByChannel(channelId: string): Promise<InternalMessage[]> {
    return prisma.internalMessage.findMany({
      where: { channelId, deletedAt: null },
      include: { 
        sender: true,
        replies: true,
        reads: true,
        pins: true
      },
      orderBy: { createdAt: 'asc' }
    })
  }
}

// --- External Inbox ---

export class ContactRepository extends BaseRepository<Contact, Prisma.ContactCreateInput, Prisma.ContactUpdateInput> {
  constructor() {
    super(prisma.contact)
  }

  async findByPhone(clinicId: string, phone: string): Promise<Contact | null> {
    return prisma.contact.findFirst({
      where: { clinicId, phone }
    })
  }
}

export class ConversationRepository extends BaseRepository<Conversation, Prisma.ConversationCreateInput, Prisma.ConversationUpdateInput> {
  constructor() {
    super(prisma.conversation)
  }

  async findWithDetails(id: string): Promise<Conversation | null> {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: true,
        messages: { include: { attachments: true } },
        notes: { include: { author: true } },
        assignedTo: true
      }
    })
  }

  async listOpen(clinicId: string): Promise<Conversation[]> {
    return prisma.conversation.findMany({
      where: { clinicId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: { contact: true, assignedTo: true },
      orderBy: { lastMessageAt: 'desc' }
    })
  }
}

export class ExternalMessageRepository extends BaseRepository<ExternalMessage, Prisma.ExternalMessageCreateInput, Prisma.ExternalMessageUpdateInput> {
  constructor() {
    super(prisma.externalMessage)
  }

  async existsByChannelId(channelMessageId: string): Promise<boolean> {
    const count = await prisma.externalMessage.count({
      where: { channelMessageId }
    })
    return count > 0
  }
}
