import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'
import * as bcrypt from 'bcrypt'

const DEFAULT_PERMISSIONS: any = {
  ADMIN: {
    'agenda.view': true,
    'agenda.manage': true,
    'patients.view': true,
    'patients.manage': true,
    'billing.view': true,
    'billing.manage': true,
    'settings.view': true,
    'settings.manage': true,
    'chat.access': true,
  },
  STAFF: {
    'agenda.view': true,
    'agenda.manage': true,
    'patients.view': true,
    'patients.manage': true,
    'billing.view': false,
    'billing.manage': false,
    'settings.view': false,
    'settings.manage': false,
    'chat.access': true,
  },
  MEMBER: {
    'agenda.view': true,
    'agenda.manage': false,
    'patients.view': true,
    'patients.manage': false,
    'billing.view': false,
    'billing.manage': false,
    'settings.view': false,
    'settings.manage': false,
    'chat.access': true,
  }
}

export class SystemUsersController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.query as { clinicId?: string }

      const systemUsers = await prisma.systemUser.findMany({
        where: clinicId ? { clinicId } : {},
        include: {
          user: {
            select: { id: true, name: true, email: true, active: true, phone: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      res.json(systemUsers)
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, name, email, role, password, permissions } = req.body

      // Try to find an existing user by email, falling back to creating a new one.
      // Using findFirst since email is no longer unique.
      let user = await prisma.user.findFirst({ where: { email } })
      if (!user) {
        const rawPassword = password?.trim() || '123456'
        const passwordHash = await bcrypt.hash(rawPassword, 8)
        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: 'STAFF',
          }
        })
      }

      const systemUser = await prisma.systemUser.create({
        data: {
          clinicId,
          userId: user.id,
          role,
          active: true,
          permissions: permissions || DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.STAFF
        },
        include: { user: { select: { id: true, name: true, email: true, active: true } } }
      })

      res.status(201).json(systemUser)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { role, active, permissions } = req.body

      const updated = await prisma.systemUser.update({
        where: { id },
        data: { role, active, permissions },
        include: { user: { select: { id: true, name: true, email: true, active: true } } }
      })

      res.json(updated)
    } catch (err) {
      next(err)
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const systemUser = await prisma.systemUser.findUnique({ where: { id } })
      if (!systemUser) {
        throw new AppError('Usuário não encontrado na clínica', 404)
      }

      await prisma.systemUser.delete({ where: { id } })

      res.json({ message: 'Usuário removido da clínica com sucesso' })
    } catch (err) {
      next(err)
    }
  }
}
