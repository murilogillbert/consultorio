import { prisma } from '../../../config/database'

/**
 * Exports a segmented patient list as CSV.
 * Segments: 'all' | 'active' | 'inactive' | 'birthday_this_month'
 */
export async function exportSegmentedListService(segment: string): Promise<string> {
  const now = new Date()
  const currentMonth = now.getMonth() + 1

  let patients: any[]

  if (segment === 'birthday_this_month') {
    patients = await prisma.patient.findMany({
      where: {
        birthDate: { not: null },
      },
      include: { user: { select: { name: true, email: true } } },
    })
    patients = patients.filter((p: any) => {
      if (!p.birthDate) return false
      return new Date(p.birthDate).getMonth() + 1 === currentMonth
    })
  } else if (segment === 'inactive') {
    // Inactive = no appointment in last 6 months
    const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
    patients = await prisma.patient.findMany({
      where: {
        appointments: {
          none: { startTime: { gte: cutoff } },
        },
      },
      include: { user: { select: { name: true, email: true } } },
    })
  } else {
    patients = await prisma.patient.findMany({
      where: { active: segment === 'inactive' ? false : true },
      include: { user: { select: { name: true, email: true } } },
    })
  }

  const escape = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const header = ['name', 'email', 'phone', 'birthDate'].join(',')
  const rows = patients.map((p: any) =>
    [escape(p.user?.name), escape(p.user?.email), escape(p.phone), escape(p.birthDate)].join(',')
  )

  return [header, ...rows].join('\n')
}
