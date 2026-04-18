import { prisma } from '../../../config/database'

export async function getNpsService(clinicId?: string) {
  // NPS based on professional reviews (rating 1-5)
  // Promoters: 5, Passives: 4, Detractors: 1-3
  const reviews = await prisma.professionalReview.findMany({
    where: clinicId
      ? { professional: { user: { systemUsers: { some: { clinicId } } } } }
      : {},
    select: { rating: true },
  })

  const total = reviews.length
  if (total === 0) return { nps: null, total: 0, promoters: 0, passives: 0, detractors: 0 }

  const promoters = reviews.filter(r => r.rating === 5).length
  const passives = reviews.filter(r => r.rating === 4).length
  const detractors = reviews.filter(r => r.rating <= 3).length

  const nps = Math.round(((promoters - detractors) / total) * 100)

  return { nps, total, promoters, passives, detractors }
}
