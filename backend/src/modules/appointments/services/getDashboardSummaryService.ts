import { prisma } from '../../../config/database'

export async function getDashboardSummaryService() {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [
    todayTotal,
    todayCompleted,
    todayCancelled,
    monthTotal,
    monthRevenue,
    activePatients,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { startTime: { gte: startOfDay, lt: endOfDay } },
    }),
    prisma.appointment.count({
      where: { startTime: { gte: startOfDay, lt: endOfDay }, status: 'COMPLETED' },
    }),
    prisma.appointment.count({
      where: { startTime: { gte: startOfDay, lt: endOfDay }, status: 'CANCELLED' },
    }),
    prisma.appointment.count({
      where: { startTime: { gte: startOfMonth } },
    }),
    prisma.payment.aggregate({
      where: { appointment: { startTime: { gte: startOfMonth } }, status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.patient.count({ where: { active: true } }),
  ])

  return {
    today: { total: todayTotal, completed: todayCompleted, cancelled: todayCancelled },
    month: { total: monthTotal, revenue: monthRevenue._sum.amount ?? 0 },
    activePatients,
  }
}
