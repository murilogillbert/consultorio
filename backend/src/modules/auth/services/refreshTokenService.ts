import { verify, sign } from 'jsonwebtoken'
import { env } from '../../../config/env'
import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function refreshTokenService(token: string) {
  let payload: any
  try {
    payload = verify(token, env.JWT_SECRET)
  } catch {
    throw new AppError('Token inválido ou expirado', 401)
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.active) {
    throw new AppError('Usuário não encontrado ou inativo', 401)
  }

  const newToken = sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '1d',
  })

  return {
    token: newToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
  }
}
