import { Socket } from 'socket.io'
import { verify } from 'jsonwebtoken'
import { env } from '../../../config/env'

interface JwtPayload {
  sub: string
  role: string
}

/**
 * Middleware Socket.io: valida o JWT enviado no handshake.
 * O cliente deve enviar: socket = io(url, { auth: { token: 'Bearer <jwt>' } })
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const raw = socket.handshake.auth?.token as string | undefined
      || socket.handshake.headers?.authorization as string | undefined

    if (!raw) {
      return next(new Error('AUTH_MISSING: token ausente'))
    }

    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw

    const payload = verify(token, env.JWT_SECRET) as JwtPayload

    // Injeta o usuário autenticado nos dados do socket para uso nos handlers
    socket.data.userId = payload.sub
    socket.data.role   = payload.role

    next()
  } catch {
    next(new Error('AUTH_INVALID: token inválido ou expirado'))
  }
}
