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
    appointments.map((appointment) => [appointment.id, appointment.service.price] as const),
  )

  const revenue = attributions.reduce((sum, attribution) => {
    return sum + (revenueByAppointmentId.get(attribution.appointmentId) ?? 0)
  }, 0)

  const cost = campaign.cost ?? campaign.budget ?? 0
  const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : null

  return {
    campaignId,
    name: campaign.name,
    channel: campaign.channel,
    leads: attributions.length,
    revenue,
    cost,
    roi,
  }
}
