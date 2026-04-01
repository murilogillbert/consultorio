import { Request, Response, NextFunction } from 'express'
import { verify } from 'jsonwebtoken'
import { env } from '../../config/env'
import { AppError } from '../errors/AppError'

interface IPayload {
  sub: string
  role: string
}

export function ensureAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    throw new AppError('Token JWT ausente', 401)
  }

  // [Bearer, <token>]
  const [, token] = authHeader.split(' ')

  try {
    const decoded = verify(token, env.JWT_SECRET) as IPayload

    req.user = {
      id: decoded.sub,
      role: decoded.role,
    }

    return next()
  } catch (err) {
    throw new AppError('Token JWT inválido', 401)
  }
}
