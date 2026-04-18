import { prisma } from '../../../config/database'
import { MetricsFilterDto } from '../dtos/metricsFilterDto'

export async function getProfessionalMetricsService(filter: MetricsFilterDto) {
  const now = new Date()
  const start = filter.startDate ? new Date(filter.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const end = filter.endDate ? new Date(filter.endDate) : now

  const professionals = await prisma.professional.findMany({
    where: filter.clinicId
      ? { user: { systemUsers: { some: { clinicId: filter.clinicId } } } }
      : {},
    include: { user: { select: { name: true } } },
  })

  const results = await Promise.all(
    professionals.map(async (p) => {
      const [completed, cancelled, revenue] = await Promise.all([
        prisma.appointment.count({
          where: { professionalId: p.id, status: 'COMPLETED', startTime: { gte: start, lte: end } },
        }),
        prisma.appointment.count({
          where: { professionalId: p.id, status: 'CANCELLED', startTime: { gte: start, lte: end } },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'PAID',
            appointment: { professionalId: p.id, startTime: { gte: start, lte: end } },
          },
          _sum: { amount: true },
        }),
      ])

      return {
        professionalId: p.id,
        name: p.user.name,
        completed,
        cancelled,
        revenue: revenue._sum.amount ?? 0,
      }
    })
  )

  return results
}
