import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function getCampaignRoiService(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      attributions: {
        include: {
          appointment: {
            include: { service: { select: { price: true } } },
          },
        },
      },
    },
  })

  if (!campaign) throw new AppError('Campanha não encontrada', 404)

  const revenue = campaign.attributions.reduce(
    (sum, a) => sum + (a.appointment?.service?.price ?? 0),
    0
  )
  const cost = campaign.cost ?? campaign.budget ?? 0
  const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : null

  return {
    campaignId,
    name: campaign.name,
    channel: campaign.channel,
    leads: campaign.attributions.length,
    revenue,
    cost,
    roi,
  }
}
