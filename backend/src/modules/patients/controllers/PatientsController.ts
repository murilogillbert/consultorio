import { Request, Response, NextFunction } from 'express'
import { PatientsService } from '../services/PatientsService'
import { PatientsRepository } from '../repositories/PatientsRepository'
import { AppError } from '../../../shared/errors/AppError'

export class PatientsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, name, email, cpf, phone, birthDate, address, notes } = req.body

      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      const result = await patientsService.executeCreate({
        userId: userId || req.user.id,
        name,
        email,
        cpf,
        phone,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        address,
        notes,
      } as any)

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query as { q?: string }
      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      let result
      if (q) {
        result = await patientsService.executeSearch(q)
      } else {
        result = await patientsService.executeList()
      }

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      const result = await patientsService.executeFindById(id)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = req.body

      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      const result = await patientsService.executeUpdate(id, data)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async requestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body
      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      await patientsService.requestOtp(email)
      res.status(200).json({ message: 'Código de verificação enviado para o seu e-mail.' })
    } catch (err) {
      next(err)
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body
      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      const result = await patientsService.verifyOtp(email, code)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async getMyAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      // req.user.id é o ID do User. Precisamos buscar o Patient associado.
      const userId = req.user.id
      const patientsRepository = new PatientsRepository()
      const patientsService = new PatientsService(patientsRepository)

      const patient = await patientsRepository.findByUserId(userId)
      if (!patient) throw new AppError('Perfil de paciente não encontrado.', 404)

      const result = await patientsService.getMyAppointments(patient.id)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
