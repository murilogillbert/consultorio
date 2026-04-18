import { prisma } from '../../../config/database'

export class OriginRepository {
  /**
   * Returns the source/attribution breakdown for appointments.
   */
  async getSourceBreakdown(clinicId: string, startDate: Date, endDate: Date) {
    const attributions = await prisma.appointmentAttribution.findMany({
      where: {
        appointment: {
          startTime: { gte: startDate, lte: endDate },
          professional: { user: { systemUsers: { some: { clinicId } } } },
        },
      },
      include: {
        campaign: { select: { name: true, channel: true } },
      },
    })

    const bySource: Record<string, number> = {}
    for (const a of attributions) {
      const key = a.campaignId ? a.campaign?.name ?? a.source : a.source
      bySource[key] = (bySource[key] ?? 0) + 1
    }

    return Object.entries(bySource).map(([source, count]) => ({ source, count }))
  }
}
