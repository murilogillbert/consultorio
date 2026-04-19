// The primary role middleware is at src/shared/middlewares/ensureRole.ts
// This module-local re-export exists for backward-compatible imports within the auth module.
export { ensureRole as roleMiddleware } from '../../../shared/middlewares/ensureRole'
