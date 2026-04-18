import { AuditRepository } from '../repositories/auditRepository'
import { Prisma } from '@prisma/client'

const auditRepository = new AuditRepository()

/**
 * Logs an audit event to the database.
 * Silent — never throws; audit failures must not disrupt business logic.
 */
export async function logEventService(params: {
  clinicId: string
  userId?: string | null
  action: string
  description: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await auditRepository.create({
      clinicId: params.clinicId,
      userId: params.userId ?? null,
      action: params.action,
      description: params.description,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
    })
  } catch (err) {
    console.error('[AuditLog] Falha ao registrar evento:', err)
  }
}
