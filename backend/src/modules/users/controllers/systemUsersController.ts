import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../../config/database'
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
      
      // 1. Create or find User
      let user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        const passwordHash = await bcrypt.hash(password || '123456', 8)
        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: 'STAFF',
          }
        })
      }

      // 2. Link to SystemUser
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
      
      await prisma.systemUser.update({
        where: { id },
        data: { active: false }
      })
      
      res.json({ message: 'Usuário removido da clínica' })
    } catch (err) {
      next(err)
    }
  }
}
