import { sign, verify } from 'jsonwebtoken'
import { env } from '../../config/env'

export function generateToken(payload: object, expiresIn: string = '1d'): string {
  return sign(payload, env.JWT_SECRET, { expiresIn } as any)
}

export function verifyToken<T = object>(token: string): T {
  return verify(token, env.JWT_SECRET) as T
}
