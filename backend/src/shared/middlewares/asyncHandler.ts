import { Request, Response, NextFunction } from 'express'

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

/**
 * Wraps an async route handler and forwards any thrown errors to next().
 * Avoids try/catch boilerplate in controllers.
 */
export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
