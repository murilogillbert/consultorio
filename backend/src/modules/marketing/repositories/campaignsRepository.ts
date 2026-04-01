import { prisma } from '../../../config/database'
import { Campaign, Prisma, AppointmentAttribution, SliderBanner, IntegrationSettings } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

// --- Marketing / Metrics ---

export class CampaignRepository extends BaseRepository<Campaign, Prisma.CampaignCreateInput, Prisma.CampaignUpdateInput> {
  constructor() {
    super(prisma.campaign)
  }

  async listActive(): Promise<Campaign[]> {
    return prisma.campaign.findMany({
      where: { active: true },
      orderBy: { startDate: 'desc' }
    })
  }

  async findWithStats(id: string): Promise<Campaign | null> {
    return prisma.campaign.findUnique({
      where: { id },
      include: { attributions: true }
    })
  }
}

export class AppointmentAttributionRepository extends BaseRepository<AppointmentAttribution, Prisma.AppointmentAttributionCreateInput, Prisma.AppointmentAttributionUpdateInput> {
  constructor() {
    super(prisma.appointmentAttribution)
  }

  async findByAppointment(appointmentId: string): Promise<AppointmentAttribution | null> {
    return prisma.appointmentAttribution.findUnique({
      where: { appointmentId },
      include: { campaign: true }
    })
  }
}

// --- Content / Slider ---

export class SliderBannerRepository extends BaseRepository<SliderBanner, Prisma.SliderBannerCreateInput, Prisma.SliderBannerUpdateInput> {
  constructor() {
    super(prisma.sliderBanner)
  }

  async listActive(): Promise<SliderBanner[]> {
    return prisma.sliderBanner.findMany({
      where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      orderBy: { order: 'asc' }
    })
  }
}

// --- Integrations ---

export class IntegrationSettingsRepository extends BaseRepository<IntegrationSettings, Prisma.IntegrationSettingsCreateInput, Prisma.IntegrationSettingsUpdateInput> {
  constructor() {
    super(prisma.integrationSettings)
  }

  async findByClinic(clinicId: string): Promise<IntegrationSettings | null> {
    return prisma.integrationSettings.findUnique({
      where: { clinicId }
    })
  }
}
