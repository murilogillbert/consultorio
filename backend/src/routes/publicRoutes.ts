import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../shared/errors/AppError'
import bcrypt from 'bcrypt'

const r = Router()

// Public booking endpoint - creates user + patient + appointment in one transaction
r.post('/book', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, cpf, phone, serviceId, professionalId, startTime, endTime, notes } = req.body

    if (!name || !email || !cpf || !phone || !serviceId || !professionalId || !startTime || !endTime) {
      throw new AppError('Preencha todos os campos obrigatórios', 400)
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if user already exists
      let user = await tx.user.findUnique({ where: { email } })

      if (!user) {
        // Create user with a temporary password
        const tempPassword = Math.random().toString(36).slice(-8)
        const passwordHash = await bcrypt.hash(tempPassword, 10)

        user = await tx.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: 'PATIENT',
            phone
          }
        })
      }

      // 2. Check if patient profile exists
      let patient = await tx.patient.findUnique({ where: { userId: user.id } })

      if (!patient) {
        // Check if CPF is already in use
        const existingCpf = await tx.patient.findUnique({ where: { cpf } })
        if (existingCpf) {
          throw new AppError('CPF já cadastrado', 400)
        }

        patient = await tx.patient.create({
          data: {
            userId: user.id,
            cpf,
            phone
          }
        })
      }

      // 3. Create the appointment
      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          professionalId,
          serviceId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: 'SCHEDULED',
          origin: 'ONLINE',
          notes
        },
        include: {
          service: true,
          professional: { include: { user: true } }
        }
      })

      return appointment
    })

    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

export default r
