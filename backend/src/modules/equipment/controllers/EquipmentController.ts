import { Request, Response, NextFunction } from 'express'
import { EquipmentService } from '../services/EquipmentService'
import { EquipmentRepository } from '../repositories/EquipmentRepository'

export class EquipmentController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, category, serialNumber, isMobile, defaultRoomId, clinicId, status, notes } = req.body

      const equipmentRepository = new EquipmentRepository()
      const equipmentService = new EquipmentService(equipmentRepository)

      const result = await equipmentService.executeCreate({
        name,
        category,
        serialNumber,
        isMobile: isMobile !== undefined ? isMobile : true,
        status: status || 'AVAILABLE',
        notes,
        clinic: { connect: { id: clinicId } },
        defaultRoom: defaultRoomId ? { connect: { id: defaultRoomId } } : undefined,
      })

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.query as { clinicId: string }

      const equipmentRepository = new EquipmentRepository()
      const equipmentService = new EquipmentService(equipmentRepository)

      const result = await equipmentService.executeListByClinic(clinicId)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const equipmentRepository = new EquipmentRepository()
      const equipmentService = new EquipmentService(equipmentRepository)

      const result = await equipmentService.executeFindById(id)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = req.body

      const equipmentRepository = new EquipmentRepository()
      const equipmentService = new EquipmentService(equipmentRepository)

      const result = await equipmentService.executeUpdate(id, data)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const equipmentRepository = new EquipmentRepository()
      const equipmentService = new EquipmentService(equipmentRepository)

      await equipmentService.executeDelete(id)

      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }
}
