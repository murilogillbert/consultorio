import { prisma } from '../../../config/database'
import { SliderBanner, Prisma } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class SliderBannerRepository extends BaseRepository<SliderBanner, Prisma.SliderBannerCreateInput, Prisma.SliderBannerUpdateInput> {
  constructor() {
    super(prisma.sliderBanner)
  }

  async findActiveByClinic(clinicId: string): Promise<SliderBanner[]> {
    return prisma.sliderBanner.findMany({
      where: {
        clinicId,
        active: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      },
      orderBy: { order: 'asc' }
    })
  }
}
