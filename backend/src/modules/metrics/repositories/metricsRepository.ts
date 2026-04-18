import { prisma } from '../../../config/database'

export class MetricsRepository {
  async getAppointmentStats(clinicId: string | undefined, start: Date, end: Date) {
    const where: any = {
      startTime: { gte: start, lte: end },
      ...(clinicId ? { room: { clinicId } } : {}),
    }

    const [total, completed, cancelled] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.appointment.count({ where: { ...where, status: 'CANCELLED' } }),
    ])

    return { total, completed, cancelled, cancellationRate: total > 0 ? (cancelled / total) * 100 : 0 }
  }

  async getRevenueStats(clinicId: string | undefined, start: Date, end: Date) {
    return prisma.payment.aggregate({
      where: {
        status: 'PAID',
        paidAt: { gte: start, lte: end },
        ...(clinicId ? { appointment: { room: { clinicId } } } : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    })
  }

  async getTopServices(clinicId: string | undefined, start: Date, end: Date, limit = 5) {
    const grouped = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        startTime: { gte: start, lte: end },
        status: 'COMPLETED',
        ...(clinicId ? { room: { clinicId } } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    })

    const services = await prisma.service.findMany({
      where: { id: { in: grouped.map(g => g.serviceId) } },
      select: { id: true, name: true },
    })

    return grouped.map(g => ({
      serviceId: g.serviceId,
      name: services.find(s => s.id === g.serviceId)?.name ?? '',
      count: g._count.id,
    }))
  }
}
