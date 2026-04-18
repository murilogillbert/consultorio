import { prisma } from '../../../config/database'

export async function getProfessionalPayoutService(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      startTime: { gte: start, lte: end },
      professional: { is: {} },
    },
    include: {
      professional: { select: { id: true, commissionPct: true, user: { select: { name: true } } } },
      service: { select: { price: true } },
    },
  })

  const byProfessional: Record<string, { name: string; totalRevenue: number; payout: number; count: number }> = {}

  for (const appt of appointments) {
    if (!appt.professional) continue
    const profId = appt.professional.id
    const price = appt.service?.price ?? 0
    const pct = appt.professional.commissionPct / 100
    const payout = price * pct

    if (!byProfessional[profId]) {
      byProfessional[profId] = {
        name: appt.professional.user.name,
        totalRevenue: 0,
        payout: 0,
        count: 0,
      }
    }

    byProfessional[profId].totalRevenue += price
    byProfessional[profId].payout += payout
    byProfessional[profId].count += 1
  }

  return Object.entries(byProfessional).map(([professionalId, data]) => ({
    professionalId,
    ...data,
  }))
}
