import { prisma } from '../../../config/database'
import { AuditLog, Prisma } from '@prisma/client'

export class AuditRepository {
  async create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
    return prisma.auditLog.create({ data })
  }

  async findMany(params: {
    clinicId?: string
    userId?: string
    action?: string
    startDate?: Date
    endDate?: Date
    skip?: number
    take?: number
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      ...(params.clinicId ? { clinicId: params.clinicId } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.action ? { action: { contains: params.action, mode: 'insensitive' } } : {}),
      ...(params.startDate || params.endDate
        ? {
            createdAt: {
              ...(params.startDate ? { gte: params.startDate } : {}),
              ...(params.endDate ? { lte: params.endDate } : {}),
            },
          }
        : {}),
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { logs, total }
  }

  async findByClinic(clinicId: string, limit = 100): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { clinicId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}
