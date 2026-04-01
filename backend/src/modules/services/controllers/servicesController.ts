import { Request, Response, NextFunction } from 'express'
import { ServicesService } from '../services/ServicesService'
import { ServicesRepository } from '../repositories/servicesRepository'

export class ServicesController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const servicesRepository = new ServicesRepository()
      const servicesService = new ServicesService(servicesRepository)

      const result = await servicesService.executeList()

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const servicesRepository = new ServicesRepository()
      const servicesService = new ServicesService(servicesRepository)

      const result = await servicesService.executeGet(id)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body

      const servicesRepository = new ServicesRepository()
      const servicesService = new ServicesService(servicesRepository)

      const result = await servicesService.executeCreate(data)

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = req.body

      const servicesRepository = new ServicesRepository()
      const servicesService = new ServicesService(servicesRepository)

      const result = await servicesService.executeUpdate(id, data)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const servicesRepository = new ServicesRepository()
      const servicesService = new ServicesService(servicesRepository)

      await servicesService.executeArchive(id)

      res.status(200).json({ message: 'Serviço arquivado com sucesso' })
    } catch (err) {
      next(err)
    }
  }
}
