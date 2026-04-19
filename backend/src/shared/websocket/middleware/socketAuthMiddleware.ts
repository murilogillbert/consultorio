import { Socket } from 'socket.io'
import { verify } from 'jsonwebtoken'
import { env } from '../../../config/env'
import { prisma } from '../../../config/database'

interface JwtPayload {
  sub: string
  role: string
}

export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const raw = socket.handshake.auth?.token as string | undefined
      || socket.handshake.headers?.authorization as string | undefined

    if (!raw) {
      return next(new Error('AUTH_MISSING: token ausente'))
    }

    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw
    const payload = verify(token, env.JWT_SECRET) as JwtPayload

    const systemUsers = await prisma.systemUser.findMany({
      where: {
        userId: payload.sub,
        active: true,
      },
      select: {
        clinicId: true,
        role: true,
      },
    })

    const clinicIds = Array.from(new Set(systemUsers.map((item) => item.clinicId)))

    socket.data.userId = payload.sub
    socket.data.role = payload.role
    socket.data.clinicIds = clinicIds

    next()
  } catch (err: any) {
    next(new Error(`AUTH_ERROR: ${err?.message || 'Token inválido'}`))
  }
}
