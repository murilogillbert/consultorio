import { hash } from 'bcrypt'
import { AppError } from '../../../shared/errors/AppError'
import { UsersRepository } from '../repositories/UsersRepository'

const DEFAULT_PASSWORD = '123456'

interface ICreateUserDTO {
  name: string
  email: string
  passwordHash?: string
  role?: string
  phone?: string
}

export class UsersService {
  constructor(private usersRepository: UsersRepository) { }

  async executeCreate({ name, email, passwordHash, role, phone }: ICreateUserDTO) {
    if (!name || !email) {
      throw new AppError('Nome e email são obrigatórios', 400)
    }

    // Use provided password or fall back to the default
    const rawPassword = passwordHash?.trim() || DEFAULT_PASSWORD
    const hashed = await hash(rawPassword, 10)

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
