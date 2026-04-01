import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../../config/database'

export class InternalChatController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.query as { clinicId?: string }
      
      const channels = await prisma.internalChannel.findMany({
        where: { 
          active: true,
          ...(clinicId ? { clinicId } : {})
        },
        include: {
          _count: {
            select: { members: true }
          }
        },
        orderBy: { name: 'asc' }
      })
      res.json(channels)
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, name, description, type, adminOnly } = req.body
      
      const newChannel = await prisma.internalChannel.create({
        data: {
          clinicId,
          name,
          description,
          type: type || 'CHANNEL',
          adminOnly: adminOnly || false,
          active: true,
          // Optional: createdById could be added if we extract user from req.user
        }
      })
      
      res.status(201).json(newChannel)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { name, description, adminOnly, active } = req.body
      
      const updatedChannel = await prisma.internalChannel.update({
        where: { id },
        data: { name, description, adminOnly, active }
      })
      
      res.json(updatedChannel)
    } catch (err) {
      next(err)
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      
      // Perform soft delete
      await prisma.internalChannel.update({
        where: { id },
        data: { active: false }
      })
      
      res.json({ message: 'Canal removido com sucesso' })
    } catch (err) {
      next(err)
    }
  }
}