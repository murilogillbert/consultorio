import { prisma } from '../../../config/database'
import { ConversationPayment, Prisma } from '@prisma/client'

export class BillingRepository {
  async createPayment(data: Prisma.ConversationPaymentUncheckedCreateInput): Promise<ConversationPayment> {
    return prisma.conversationPayment.create({ data })
  }

  async findPaymentById(id: string): Promise<ConversationPayment | null> {
    return prisma.conversationPayment.findFirst({ where: { id } })
  }

  async updatePayment(id: string, data: Prisma.ConversationPaymentUpdateInput): Promise<ConversationPayment> {
    return prisma.conversationPayment.update({ where: { id }, data })
  }

  async findPaymentsByConversation(conversationId: string): Promise<ConversationPayment[]> {
    return prisma.conversationPayment.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOverduePayments(): Promise<ConversationPayment[]> {
    // ConversationPayment has no dueAt — overdue means PENDING older than 7 days
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return prisma.conversationPayment.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
    })
  }

  async getBillingReport(clinicId: string, startDate: Date, endDate: Date) {
    const conversations = await prisma.conversation.findMany({
      where: { clinicId },
      include: {
        payments: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        },
      },
    })

    const payments = conversations.flatMap(c => c.payments)

    const totalRevenue = payments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalPending = payments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0)

    const byMethod: Record<string, number> = {}
    for (const p of payments.filter(p => p.status === 'PAID')) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount
    }

    return { totalRevenue, totalPending, byMethod, payments }
  }
}
