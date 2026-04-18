import { prisma } from '../../../config/database'
import { MetricsFilterDto } from '../dtos/metricsFilterDto'

export async function getServiceMetricsService(filter: MetricsFilterDto) {
  const now = new Date()
  const start = filter.startDate ? new Date(filter.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const end = filter.endDate ? new Date(filter.endDate) : now

  const grouped = await prisma.appointment.groupBy({
    by: ['serviceId'],
    where: {
      startTime: { gte: start, lte: end },
      status: 'COMPLETED',
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  const services = await prisma.service.findMany({
    where: { id: { in: grouped.map(g => g.serviceId) } },
    select: { id: true, name: true, price: true, duration: true },
  })

  return grouped.map(g => ({
    serviceId: g.serviceId,
    ...services.find(s => s.id === g.serviceId),
    appointments: g._count.id,
    estimatedRevenue: (services.find(s => s.id === g.serviceId)?.price ?? 0) * g._count.id,
  }))
}
