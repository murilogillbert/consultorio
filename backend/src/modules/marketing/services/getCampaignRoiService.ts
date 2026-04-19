import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function getCampaignRoiService(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  })

  if (!campaign) {
    throw new AppError('Campanha nao encontrada', 404)
  }

  const attributions = await prisma.appointmentAttribution.findMany({
    where: { campaignId },
    select: { appointmentId: true },
  })

  const appointments = attributions.length
    ? await prisma.appointment.findMany({
        where: {
          id: { in: attributions.map((attribution) => attribution.appointmentId) },
        },
        select: {
          id: true,
          service: { select: { price: true } },
        },
      })
    : []

  const revenueByAppointmentId = new Map(
    appointments.map((appointment) => [
      appointment.id,
      appointment.service?.price ?? 0,
    ])
  )

  const revenue = Array.from(revenueByAppointmentId.values()).reduce((sum, price) => sum + price, 0)
  const cost = campaign.budget ?? 0
  const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0

  return {
    campaignId,
    revenue,
    cost,
    roi,
    conversions: attributions.length,
  }
}
