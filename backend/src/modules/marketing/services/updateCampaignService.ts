import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function updateCampaignService(id: string, data: Record<string, unknown>) {
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) throw new AppError('Campanha não encontrada', 404)
  return prisma.campaign.update({ where: { id }, data: data as any })
}
