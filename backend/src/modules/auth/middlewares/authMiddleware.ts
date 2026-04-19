// The primary auth middleware is at src/shared/middlewares/ensureAuthenticated.ts
// This module-local re-export exists for backward-compatible imports within the auth module.
export { ensureAuthenticated as authMiddleware } from '../../../shared/middlewares/ensureAuthenticated'
