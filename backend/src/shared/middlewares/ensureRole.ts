import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'

export function ensureRole(rolesAllowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role

    if (!userRole) {
      throw new AppError('Usuário não autenticado no middleware de role', 401)
    }

    if (!rolesAllowed.includes(userRole)) {
      throw new AppError('Acesso negado. Nível de permissão insuficiente', 403)
    }

    return next()
  }
}
