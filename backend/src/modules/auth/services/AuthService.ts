import { compare } from 'bcrypt'
import { sign } from 'jsonwebtoken'
import { env } from '../../../config/env'
import { AppError } from '../../../shared/errors/AppError'
import { AuthRepository } from '../repositories/AuthRepository'

interface IAuthDTO {
  email: string
  password?: string
}

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async executeLogin({ email, password }: IAuthDTO) {
    if (!email || !password) {
      throw new AppError('Email e senha obrigatórios', 400)
    }

    const user = await this.authRepository.findUserByEmail(email)

    if (!user) {
      throw new AppError('Credenciais incorretas', 401)
    }

    if (!user.active) {
      throw new AppError('Usuário inativo. Contate o suporte', 403)
    }

    const isPasswordValid = await compare(password, user.passwordHash)

    if (!isPasswordValid) {
      // Avoid exposing "wrong password" vs "wrong email" for security
      throw new AppError('Credenciais incorretas', 401)
    }

    const token = sign(
      {
        role: user.role,
      },
      env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: '1d', // Token expira em 1 dia
      }
    )

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      token,
    }
  }
}
