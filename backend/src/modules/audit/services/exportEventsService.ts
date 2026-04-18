import { AuditRepository } from '../repositories/auditRepository'
import { AuditFilterDto } from '../dtos/auditFilterDto'

const auditRepository = new AuditRepository()

/**
 * Exports audit logs as a CSV string.
 */
export async function exportEventsService(filter: AuditFilterDto): Promise<string> {
  const { logs } = await auditRepository.findMany({
    clinicId: filter.clinicId,
    userId: filter.userId,
    action: filter.action,
    startDate: filter.startDate ? new Date(filter.startDate) : undefined,
    endDate: filter.endDate ? new Date(filter.endDate) : undefined,
    take: 10000,
  })

  const escape = (val: unknown) => {
    const str = val === null || val === undefined ? '' : String(val)
    return '"' + str.replace(/"/g, '""') + '"'
  }

  const header = ['id', 'clinicId', 'userId', 'userName', 'action', 'description', 'createdAt'].join(',')

  const rows = logs.map((log: any) =>
    [
      escape(log.id),
      escape(log.clinicId),
      escape(log.userId),
      escape(log.user?.name ?? ''),
      escape(log.action),
      escape(log.description),
      escape(log.createdAt.toISOString()),
    ].join(',')
  )

  return [header, ...rows].join('\n')
}
