import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../../config/database'

export class InsuranceController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.query as { clinicId?: string }
      
      const insurances = await prisma.insurancePlan.findMany({
        where: { 
          active: true,
          ...(clinicId ? { clinicId } : {})
        },
        orderBy: { name: 'asc' }
      })
      res.json(insurances)
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, name, documentsRequired } = req.body
      
      const newInsurance = await prisma.insurancePlan.create({
        data: {
          clinicId,
          name,
          documentsRequired,
          active: true
        }
      })
      
      res.status(201).json(newInsurance)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { name, documentsRequired, active } = req.body
      
      const updatedInsurance = await prisma.insurancePlan.update({
        where: { id },
        data: { name, documentsRequired, active }
      })
      
      res.json(updatedInsurance)
    } catch (err) {
      next(err)
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      
      // Perform soft delete
      await prisma.insurancePlan.update({
        where: { id },
        data: { active: false }
      })
      
      res.json({ message: 'Convênio removido com sucesso' })
    } catch (err) {
      next(err)
    }
  }
}
