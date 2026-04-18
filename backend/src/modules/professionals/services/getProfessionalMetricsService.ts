import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function getProfessionalMetricsService(professionalId: string) {
  const professional = await prisma.professional.findUnique({ where: { id: professionalId } })
  if (!professional) throw new AppError('Profissional não encontrado', 404)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalAppointments, completedThisMonth, cancelledThisMonth, avgRating] = await Promise.all([
    prisma.appointment.count({ where: { professionalId } }),
    prisma.appointment.count({
      where: { professionalId, status: 'COMPLETED', startTime: { gte: startOfMonth } },
    }),
    prisma.appointment.count({
      where: { professionalId, status: 'CANCELLED', startTime: { gte: startOfMonth } },
    }),
    prisma.professionalReview.aggregate({
      where: { professionalId },
      _avg: { rating: true },
    }),
  ])

  return {
    professionalId,
    totalAppointments,
    completedThisMonth,
    cancelledThisMonth,
    averageRating: avgRating._avg.rating ?? 0,
  }
}
