import { Request, Response, NextFunction } from 'express'
import { AppointmentsService } from '../services/AppointmentsService'
import { AppointmentsRepository } from '../../patients/repositories/PatientsRepository'
import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'
import { cancelFutureAppointmentsService } from '../services/cancelFutureAppointmentsService'
import { deleteFutureAppointmentsService } from '../services/deleteFutureAppointmentsService'

export class AppointmentsController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { start, end } = req.query as { start: string; end: string }

      const appointmentsRepository = new AppointmentsRepository()
      const appointmentsService = new AppointmentsService(appointmentsRepository)

      const result = await appointmentsService.executeList(
        new Date(start || new Date().toISOString()),
        new Date(end || new Date().toISOString())
      )

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body

      const appointmentsRepository = new AppointmentsRepository()
      const appointmentsService = new AppointmentsService(appointmentsRepository)

      const result = await appointmentsService.executeCreate(data)

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const dto = req.body || {}

      const data: any = { ...dto }
      if (dto.startTime) data.startTime = new Date(dto.startTime)
      if (dto.endTime) data.endTime = new Date(dto.endTime)

      const appointmentsRepository = new AppointmentsRepository()
      const appointmentsService = new AppointmentsService(appointmentsRepository)
      const result = await appointmentsService.executeUpdate(id, data)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { status } = req.body
      const appointmentsRepository = new AppointmentsRepository()
      const appointmentsService = new AppointmentsService(appointmentsRepository)
      const result = await appointmentsService.executeUpdateStatus(id, status)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  // PATCH /appointments/:id/confirmation
  async updateConfirmation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { value } = req.body as { value: string }
      const valid = ['PENDING', 'CONFIRMED', 'NOT_CONFIRMED']
      const v = (value || '').toUpperCase()
      if (!valid.includes(v)) throw new AppError('Confirmação inválida', 400)
      const appt = await prisma.appointment.findUnique({ where: { id } })
      if (!appt) throw new AppError('Agendamento não encontrado', 404)
      const updated = await prisma.appointment.update({ where: { id }, data: { patientConfirmation: v } })
      res.status(200).json(updated)
    } catch (err) {
      next(err)
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { reason, source } = req.body

      const appointmentsRepository = new AppointmentsRepository()
      const appointmentsService = new AppointmentsService(appointmentsRepository)

      const result = await appointmentsService.executeCancel(id, reason, source || 'RECEPTION')

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  // PATCH /appointments/:id/cancel-future
  async cancelFuture(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { reason, source } = req.body || {}
      const result = await cancelFutureAppointmentsService(id, reason, source)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  // DELETE /appointments/:id/permanent
  // Exclusão real: remove o agendamento e todas as suas dependências
  // (EquipmentUsage, Payment, ProfessionalReview). Diferente do cancelamento,
  // o registro deixa de existir no histórico. Usar com cuidado.
  async deletePermanent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const appt = await prisma.appointment.findUnique({ where: { id } })
      if (!appt) throw new AppError('Agendamento não encontrado', 404)

      await prisma.$transaction(async (tx) => {
        // Deleta dependências em ordem (filhos antes do pai)
        await tx.equipmentUsage.deleteMany({ where: { appointmentId: id } })
        await tx.payment.deleteMany({ where: { appointmentId: id } })
        // Reviews vinculadas a este agendamento são limpas (não bloqueiam o delete)
        await tx.professionalReview.updateMany({
          where: { appointmentId: id },
          data: { appointmentId: null },
        })
        await tx.appointment.delete({ where: { id } })
      })

      res.status(200).json({ message: 'Agendamento excluído permanentemente.' })
    } catch (err) {
      next(err)
    }
  }

  // DELETE /appointments/:id/permanent-future
  // Exclui PERMANENTEMENTE este agendamento e todos os futuros da mesma
  // série de recorrência (a partir do startTime selecionado). Não toca
  // em consultas passadas. Diferente do cancel-future (mantém em cinza),
  // aqui os registros somem do banco.
  async deletePermanentFuture(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const result = await deleteFutureAppointmentsService(id)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
