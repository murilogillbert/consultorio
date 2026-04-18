import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function getServiceMetricsService(serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) throw new AppError('Serviço não encontrado', 404)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalAppointments, monthAppointments, revenue] = await Promise.all([
    prisma.appointment.count({ where: { serviceId } }),
    prisma.appointment.count({ where: { serviceId, startTime: { gte: startOfMonth } } }),
    prisma.payment.aggregate({
      where: { appointment: { serviceId }, status: 'PAID' },
      _sum: { amount: true },
    }),
  ])

  return {
    serviceId,
    name: service.name,
    totalAppointments,
    monthAppointments,
    revenue: revenue._sum.amount ?? 0,
    pricePerSession: service.price,
  }
}
