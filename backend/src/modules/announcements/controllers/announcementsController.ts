import { Request, Response, NextFunction } from 'express'
import { AnnouncementRepository, AnnouncementReadRepository } from '../repositories/announcementsRepository'
import { CreateAnnouncementService } from '../services/createAnnouncementService'
import { ListAnnouncementsService } from '../services/listAnnouncementsService'
import { UpdateAnnouncementService } from '../services/updateAnnouncementService'
import { DeleteAnnouncementService } from '../services/deleteAnnouncementService'
import { MarkAnnouncementReadService } from '../services/markAnnouncementReadService'
import { GetAnnouncementReadStatsService } from '../services/getAnnouncementReadStatsService'
import { ResendAnnouncementService } from '../services/resendAnnouncementService'
import { prisma } from '../../../config/database'
import { requireSingleString } from '../../../shared/utils/requestUtils'

export class AnnouncementsController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.query as { clinicId?: string }
      const service = new ListAnnouncementsService()
      const result = await service.execute(clinicId)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id
      const { clinicId, title, content, fileUrl, urgency, audience, audienceIds, expiresAt } = req.body

      // Se clinicId não vier no body, busca via SystemUser do usuário logado
      let resolvedClinicId = clinicId
      if (!resolvedClinicId) {
        const systemUser = await prisma.systemUser.findFirst({ where: { userId } })
        if (systemUser) resolvedClinicId = systemUser.clinicId
      }

      const repo = new AnnouncementRepository()
      const service = new CreateAnnouncementService(repo)
      const result = await service.execute({
        clinicId: resolvedClinicId,
        publishedById: userId,
        title,
        content,
        fileUrl,
        urgency,
        audience,
        audienceIds,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })
      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = requireSingleString(req.params.id, 'id')
      const repo = new AnnouncementRepository()
      const service = new UpdateAnnouncementService(repo)
      const result = await service.execute({ id, ...req.body })
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = requireSingleString(req.params.id, 'id')
      const repo = new AnnouncementRepository()
      const service = new DeleteAnnouncementService(repo)
      await service.execute(id)
      res.json({ message: 'Aviso arquivado com sucesso' })
    } catch (err) {
      next(err)
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = requireSingleString(req.params.id, 'id')
      const userId = req.user.id
      const readRepo = new AnnouncementReadRepository()
      const service = new MarkAnnouncementReadService(readRepo)
      const result = await service.execute(id, userId)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async readStats(req: Request, res: Response, next: NextFunction) {
    try {
      const id = requireSingleString(req.params.id, 'id')
      const repo = new AnnouncementRepository()
      const service = new GetAnnouncementReadStatsService(repo)
      const result = await service.execute(id)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async resend(req: Request, res: Response, next: NextFunction) {
    try {
      const id = requireSingleString(req.params.id, 'id')
      const repo = new AnnouncementRepository()
      const service = new ResendAnnouncementService(repo)
      const result = await service.execute(id)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
}
