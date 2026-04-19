import { prisma } from '../../../config/database'
import { CreateCampaignDto } from '../dtos/createCampaignDto'

export async function createCampaignService(dto: CreateCampaignDto) {
  return prisma.campaign.create({
    data: {
      clinicId: dto.clinicId,
      name: dto.name,
      channel: dto.channel,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      budget: dto.budget,
      targetSegment: dto.targetSegment,
      notes: dto.notes,
    },
  })
}
