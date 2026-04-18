import { prisma } from '../../../config/database'

export async function listUsersService(clinicId?: string) {
  if (clinicId) {
    return prisma.systemUser.findMany({
      where: { clinicId, active: true },
      include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, phone: true } } },
      orderBy: { user: { name: 'asc' } },
    })
  }

  return prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, phone: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
}
