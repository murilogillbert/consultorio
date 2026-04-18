import { AuditRepository } from '../repositories/auditRepository'
import { AuditFilterDto } from '../dtos/auditFilterDto'

const auditRepository = new AuditRepository()

export async function listEventsService(filter: AuditFilterDto) {
  const page = Math.max(1, filter.page ?? 1)
  const limit = Math.min(200, filter.limit ?? 50)
  const skip = (page - 1) * limit

  const startDate = filter.startDate ? new Date(filter.startDate) : undefined
  const endDate = filter.endDate ? new Date(filter.endDate) : undefined

  const { logs, total } = await auditRepository.findMany({
    clinicId: filter.clinicId,
    userId: filter.userId,
    action: filter.action,
    startDate,
    endDate,
    skip,
    take: limit,
  })

  return {
    data: logs,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  }
}
