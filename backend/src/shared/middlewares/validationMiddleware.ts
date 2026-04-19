import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'

type ValidatorFn = (body: Record<string, unknown>) => Record<string, string>

/**
 * Runs a validation function against req.body.
 * If the validator returns any errors, responds 400 with them.
 *
 * Usage: router.post('/path', validationMiddleware(myValidator), handler)
 */
export function validationMiddleware(validator: ValidatorFn) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors = validator(req.body)
    if (Object.keys(errors).length > 0) {
      throw new AppError('Erro de validação: ' + Object.values(errors).join(', '), 400)
    }
    next()
  }
}
