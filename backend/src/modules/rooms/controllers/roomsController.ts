import { Request, Response, NextFunction } from 'express'
import { RoomsService } from '../services/RoomsService'
import { RoomsRepository } from '../repositories/roomsRepository'

export class RoomsController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.query as { clinicId?: string }

      const roomsRepository = new RoomsRepository()
      const roomsService = new RoomsService(roomsRepository)

      const result = await roomsService.executeList(clinicId)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const roomsRepository = new RoomsRepository()
      const roomsService = new RoomsService(roomsRepository)

      const result = await roomsService.executeGet(id)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body

      const roomsRepository = new RoomsRepository()
      const roomsService = new RoomsService(roomsRepository)

      const result = await roomsService.executeCreate(data)

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = req.body

      const roomsRepository = new RoomsRepository()
      const roomsService = new RoomsService(roomsRepository)

      const result = await roomsService.executeUpdate(id, data)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const roomsRepository = new RoomsRepository()
      const roomsService = new RoomsService(roomsRepository)

      await roomsService.executeDelete(id)

      res.status(200).json({ message: 'Sala removida com sucesso' })
    } catch (err) {
      next(err)
    }
  }
}
