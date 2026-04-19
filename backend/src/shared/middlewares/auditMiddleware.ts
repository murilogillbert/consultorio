import { Request, Response, NextFunction } from 'express'
import { logEventService } from '../../modules/audit/services/logEventService'

/**
 * Logs write operations (POST/PUT/PATCH/DELETE) to the audit trail.
 * Attach to routes that need tracking.
 *
 * Usage: router.post('/path', ensureAuthenticated, auditMiddleware('ACTION'), handler)
 */
export function auditMiddleware(action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const clinicId = (req.query.clinicId as string) || (req.params.clinicId as string)
      if (clinicId && req.user?.id) {
        await logEventService({
          clinicId,
          userId: req.user.id,
          action,
          description: `${req.method} ${req.originalUrl}`,
          metadata: { body: req.body, params: req.params },
        })
      }
    } catch {
      // Audit failures must never break the request flow
    }
    next()
  }
}
