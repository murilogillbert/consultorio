import { prisma } from '../../../config/database'
import { MetricsFilterDto } from '../dtos/metricsFilterDto'

export async function getOccupancyRateService(filter: MetricsFilterDto) {
  const now = new Date()
  const start = filter.startDate ? new Date(filter.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const end = filter.endDate ? new Date(filter.endDate) : now

  // Count total working-hour slots and booked slots
  const workingHours = await prisma.workingHour.findMany({
    where: filter.clinicId ? { clinicId: filter.clinicId } : {},
  })

  const avgDailySlots = workingHours.reduce((sum, wh) => {
    if (wh.closed) return sum
    const [oh, om] = wh.opens.split(':').map(Number)
    const [ch, cm] = wh.closes.split(':').map(Number)
    const minutesOpen = (ch * 60 + cm) - (oh * 60 + om)
    return sum + Math.floor(minutesOpen / 60) // 1h slots
  }, 0)

  const dayCount = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  const totalSlots = avgDailySlots * dayCount

  const booked = await prisma.appointment.count({
    where: {
      startTime: { gte: start, lte: end },
      status: { notIn: ['CANCELLED'] },
      ...(filter.clinicId ? { room: { clinicId: filter.clinicId } } : {}),
    },
  })

  const occupancyRate = totalSlots > 0 ? Math.min(100, (booked / totalSlots) * 100) : 0

  return { start, end, totalSlots, booked, occupancyRate: Math.round(occupancyRate * 100) / 100 }
}
