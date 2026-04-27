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

    // Multiple users can share the same email (e.g. dependents).
    // Try each active user with this email until one matches the password.
    const users = await this.authRepository.findUsersByEmail(email)

    if (users.length === 0) {
      throw new AppError('Credenciais incorretas', 401)
    }

    let matchedUser = null
    for (const user of users) {
      const isPasswordValid = await compare(password, user.passwordHash)
      if (isPasswordValid) {
        matchedUser = user
        break
      }
    }

    if (!matchedUser) {
      throw new AppError('Credenciais incorretas', 401)
    }

    const token = sign(
      {
        role: matchedUser.role,
      },
      env.JWT_SECRET,
      {
        subject: matchedUser.id,
        expiresIn: '1d',
      }
    )

    return {
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        avatarUrl: matchedUser.avatarUrl,
      },
      token,
    }
  }
}
