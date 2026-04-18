import { MetricsRepository } from '../repositories/metricsRepository'
import { MetricsFilterDto } from '../dtos/metricsFilterDto'

const metricsRepository = new MetricsRepository()

function parsePeriod(filter: MetricsFilterDto): { start: Date; end: Date } {
  if (filter.startDate && filter.endDate) {
    return { start: new Date(filter.startDate), end: new Date(filter.endDate) }
  }
  const now = new Date()
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return { start, end: now }
}

export async function getExecutiveDashboardService(filter: MetricsFilterDto) {
  const { start, end } = parsePeriod(filter)

  const [appointmentStats, revenueStats, topServices] = await Promise.all([
    metricsRepository.getAppointmentStats(filter.clinicId, start, end),
    metricsRepository.getRevenueStats(filter.clinicId, start, end),
    metricsRepository.getTopServices(filter.clinicId, start, end),
  ])

  return {
    period: { start, end },
    appointments: appointmentStats,
    revenue: { total: revenueStats._sum.amount ?? 0, transactions: revenueStats._count.id },
    topServices,
  }
}
