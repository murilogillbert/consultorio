import { prisma } from '../../../config/database'

export async function getConversionFunnelService(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const [contacts, conversations, scheduled, completed] = await Promise.all([
    prisma.contact.count({ where: { clinicId, createdAt: { gte: start, lte: end } } }),
    prisma.conversation.count({ where: { clinicId, createdAt: { gte: start, lte: end } } }),
    prisma.appointment.count({
      where: { startTime: { gte: start, lte: end }, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
    }),
    prisma.appointment.count({
      where: { startTime: { gte: start, lte: end }, status: 'COMPLETED' },
    }),
  ])

  return {
    funnel: [
      { stage: 'Contatos', count: contacts },
      { stage: 'Conversas', count: conversations },
      { stage: 'Agendamentos', count: scheduled },
      { stage: 'Atendimentos', count: completed },
    ],
    period: { start, end },
  }
}
