import { hash } from 'bcrypt'
import { AppError } from '../../../shared/errors/AppError'
import { UsersRepository } from '../repositories/UsersRepository'
import { Prisma } from '@prisma/client'

interface ICreateUserDTO {
  name: string
  email: string
  passwordHash?: string // Input can be raw password
  role?: string
  phone?: string
}

export class UsersService {
  constructor(private usersRepository: UsersRepository) { }

  async executeCreate({ name, email, passwordHash, role, phone }: ICreateUserDTO) {
    if (!name || !email || !passwordHash) {
      throw new AppError('Nome, email e senha são obrigatórios', 400)
    }

    const userExists = await this.usersRepository.findByEmail(email)

    if (userExists) {
      throw new AppError('Este e-mail já está em uso', 400)
    }

    const hashed = await hash(passwordHash, 10)

    const user = await this.usersRepository.create({
      name,
      email,
      passwordHash: hashed,
      role: role || 'PATIENT',
      phone,
    })

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    }
  }

  async executeList() {
    const users = await this.usersRepository.list()
    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      avatarUrl: u.avatarUrl,
      phone: u.phone,
      createdAt: u.createdAt,
    }))
  }

  async executeFindById(id: string) {
    const user = await this.usersRepository.findById(id)

    if (!user) {
      throw new AppError('Usuário não encontrado', 404)
    }

    return user
  }
}
