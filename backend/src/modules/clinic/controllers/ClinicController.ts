import { Request, Response, NextFunction } from 'express'
import { ClinicService } from '../services/ClinicService'
import { ClinicRepository } from '../repositories/ClinicRepository'
import { setupGmailWatch, stopGmailWatch } from '../../messaging/channels/gmail/gmailWatchService'

export class ClinicController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeCreate(data)

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeList()

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeFindById(id)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = req.body

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeUpdate(id, data)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.executeGetByUserId(userId)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async getIntegrations(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = { ...req.params, ...req.query } as { clinicId: string }
      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.getIntegrations(clinicId)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async updateIntegrations(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.params as { clinicId: string }

      // Map frontend field names (matching C# DTO) to Prisma schema field names.
      // Sanitize MP tokens to strip BOM, surrounding whitespace, and control chars
      // that would cause "Request headers must contain only ASCII characters" errors.
      const body = req.body as Record<string, any>
      const sanitizeToken = (v: unknown) =>
        typeof v === 'string' ? v.replace(/^\uFEFF/, '').trim() : v

      const data: Record<string, any> = { ...body }

      if ('accessTokenProd' in body) {
        data.mpAccessTokenProd = body.accessTokenProd ? sanitizeToken(body.accessTokenProd) : null
        delete data.accessTokenProd
      }
      if ('accessTokenSandbox' in body) {
        data.mpAccessTokenSandbox = body.accessTokenSandbox ? sanitizeToken(body.accessTokenSandbox) : null
        delete data.accessTokenSandbox
      }
      if ('publicKey' in body) {
        data.mpPublicKeyProd = body.publicKey || null
        delete data.publicKey
      }
      if ('sandboxMode' in body) {
        data.mpSandboxMode = Boolean(body.sandboxMode)
        delete data.sandboxMode
      }
      if ('connected' in body) {
        data.mpConnected = Boolean(body.connected)
        delete data.connected
      }

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.updateIntegrations(clinicId, data)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async testIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, type } = req.params as { clinicId: string; type: string }

      const clinicRepository = new ClinicRepository()
      const clinicService = new ClinicService(clinicRepository)

      const result = await clinicService.testIntegration(clinicId, type)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async setupGmailWatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.params as { clinicId: string }
      const result = await setupGmailWatch(clinicId)
      res.status(200).json({
        ok: true,
        message: 'Gmail watch ativado com sucesso.',
        historyId: result.historyId,
        expiresAt: result.expiresAt,
      })
    } catch (err) {
      next(err)
    }
  }

  async stopGmailWatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.params as { clinicId: string }
      await stopGmailWatch(clinicId)
      res.status(200).json({
        ok: true,
        message: 'Gmail watch desativado com sucesso.',
      })
    } catch (err) {
      next(err)
    }
  }
}