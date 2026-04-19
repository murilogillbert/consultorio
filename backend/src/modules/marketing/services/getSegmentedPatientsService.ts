import { prisma } from '../../../config/database'

export async function getSegmentedPatientsService(segment: string) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1

  if (segment === 'birthday_this_month') {
    const all = await prisma.patient.findMany({
      where: { birthDate: { not: null } },
      include: { user: { select: { name: true, email: true } } },
    })
    return all.filter(p => p.birthDate && new Date(p.birthDate).getMonth() + 1 === currentMonth)
  }

  if (segment === 'inactive') {
    const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
    return prisma.patient.findMany({
      where: { appointments: { none: { startTime: { gte: cutoff } } } },
      include: { user: { select: { name: true, email: true } } },
    })
  }

  return prisma.patient.findMany({
    where: { active: true },
    include: { user: { select: { name: true, email: true } } },
  })
}
