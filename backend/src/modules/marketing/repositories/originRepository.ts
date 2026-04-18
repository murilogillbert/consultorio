import { prisma } from '../../../config/database'

export class OriginRepository {
  /**
   * Returns the source/attribution breakdown for appointments.
   */
  async getSourceBreakdown(clinicId: string, startDate: Date, endDate: Date) {
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: startDate, lte: endDate },
        professional: { user: { systemUsers: { some: { clinicId } } } },
      },
      select: { id: true },
    })

    if (appointments.length === 0) {
      return []
    }

    const attributions = await prisma.appointmentAttribution.findMany({
      where: {
        appointmentId: { in: appointments.map((appointment) => appointment.id) },
      },
      include: {
        campaign: { select: { name: true, channel: true } },
      },
    })

    const bySource: Record<string, number> = {}
    for (const attribution of attributions) {
      const key = attribution.campaignId
        ? attribution.campaign?.name ?? attribution.source
        : attribution.source

      bySource[key] = (bySource[key] ?? 0) + 1
    }

    return Object.entries(bySource).map(([source, count]) => ({ source, count }))
  }
}
