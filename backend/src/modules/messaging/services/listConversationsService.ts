import { prisma } from '../../../config/database'

interface ListConversationsInput {
  clinicId: string
  channel?: string
  status?: string
  page?: number
  limit?: number
}

/**
 * Lista conversas de uma clínica com paginação e filtros.
 */
export async function listConversationsService(input: ListConversationsInput) {
  const page = input.page ?? 1
  const limit = input.limit ?? 20
  const skip = (page - 1) * limit

  const where = {
    clinicId: input.clinicId,
    ...(input.channel ? { channel: input.channel } : {}),
    ...(input.status ? { status: input.status } : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
  }

  const [conversations, total] = await prisma.$transaction([
    prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, direction: true, type: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.conversation.count({ where }),
  ])

  return {
    data: conversations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
