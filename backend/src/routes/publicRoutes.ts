import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../shared/errors/AppError'
import bcrypt from 'bcrypt'
import { sign, verify } from 'jsonwebtoken'
import { env } from '../config/env'
import { sendOtpEmail } from '../shared/services/emailService'

const r = Router()

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function signPatientToken(userId: string): string {
  return sign({ role: 'PATIENT' }, env.JWT_SECRET, { subject: userId, expiresIn: '7d' })
}

/** Middleware leve para rotas de paciente autenticado */
function requirePatient(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth) throw new AppError('Token ausente', 401)
  const [, token] = auth.split(' ')
  try {
    const payload = verify(token, env.JWT_SECRET) as { sub: string; role: string }
    if (payload.role !== 'PATIENT') throw new AppError('Acesso negado', 403)
    req.user = { id: payload.sub, role: 'PATIENT' }
    next()
  } catch {
    throw new AppError('Token inválido', 401)
  }
}

// ─── OTP: Solicitar código ──────────────────────────────────────────────────

r.post('/patient/request-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body
    if (!email) throw new AppError('Email obrigatório', 400)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.role !== 'PATIENT') {
      // Retornamos 200 mesmo assim para não vazar se o email existe
      return res.status(200).json({ message: 'Se o email estiver cadastrado, você receberá o código.' })
    }

    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiresAt: expiresAt },
    })

    await sendOtpEmail(email, user.name, otp)

    res.status(200).json({ message: 'Código enviado para o seu email.' })
  } catch (err) {
    next(err)
  }
})

// ─── OTP: Verificar código ──────────────────────────────────────────────────

r.post('/patient/verify-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) throw new AppError('Email e código são obrigatórios', 400)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.role !== 'PATIENT') throw new AppError('Credenciais inválidas', 401)

    if (!user.otpCode || user.otpCode !== String(otp)) {
      throw new AppError('Código inválido', 401)
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new AppError('Código expirado. Solicite um novo.', 401)
    }

    // Invalida o OTP após uso
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null },
    })

    const token = signPatientToken(user.id)

    res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err) {
    next(err)
  }
})

// ─── Paciente: Minhas consultas ─────────────────────────────────────────────

r.get('/patient/appointments', requirePatient, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } })
    if (!patient) return res.json([])

    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        service: true,
        professional: { include: { user: { select: { name: true, avatarUrl: true } } } },
      },
      orderBy: { startTime: 'desc' },
    })

    res.json(appointments)
  } catch (err) {
    next(err)
  }
})

// ─── Paciente: Conversa com a clínica ──────────────────────────────────────

r.get('/patient/conversation', requirePatient, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) throw new AppError('Usuário não encontrado', 404)

    const contact = await prisma.contact.findFirst({
      where: { email: user.email },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 100,
            },
          },
        },
      },
    })

    if (!contact || contact.conversations.length === 0) {
      return res.json({ conversation: null, messages: [] })
    }

    const conversation = contact.conversations[0]
    res.json({ conversation, messages: conversation.messages })
  } catch (err) {
    next(err)
  }
})

r.post('/patient/conversation/message', requirePatient, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body
    if (!content?.trim()) throw new AppError('Mensagem não pode estar vazia', 400)

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) throw new AppError('Usuário não encontrado', 404)

    const contact = await prisma.contact.findFirst({ where: { email: user.email } })
    if (!contact) throw new AppError('Contato não encontrado. Agende uma consulta primeiro.', 404)

    let conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id },
      orderBy: { createdAt: 'desc' },
    })

    if (!conversation) throw new AppError('Nenhuma conversa encontrada.', 404)

    const msg = await prisma.externalMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'IN',
        type: 'TEXT',
        content: content.trim(),
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    })

    res.status(201).json(msg)
  } catch (err) {
    next(err)
  }
})

// ─── Agendamento público (criação de consulta) ─────────────────────────────

r.post('/book', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, cpf, phone, serviceId, professionalId, startTime, endTime, notes } = req.body

    if (!name || !email || !cpf || !phone || !serviceId || !professionalId || !startTime || !endTime) {
      throw new AppError('Preencha todos os campos obrigatórios', 400)
    }

    // Buscar clínica via profissional
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      include: { user: { include: { systemUsers: { take: 1 } } } },
    })
    const clinicId = professional?.user?.systemUsers?.[0]?.clinicId

    const result = await prisma.$transaction(async (tx) => {
      // 1. Usuário
      let user = await tx.user.findUnique({ where: { email } })
      if (!user) {
        const tempPassword = Math.random().toString(36).slice(-8)
        const passwordHash = await bcrypt.hash(tempPassword, 10)
        user = await tx.user.create({
          data: { name, email, passwordHash, role: 'PATIENT', phone },
        })
      }

      // 2. Paciente
      let patient = await tx.patient.findUnique({ where: { userId: user.id } })
      if (!patient) {
        const existingCpf = await tx.patient.findUnique({ where: { cpf } })
        if (existingCpf) throw new AppError('CPF já cadastrado', 400)
        patient = await tx.patient.create({
          data: { userId: user.id, cpf, phone },
        })
      }

      // 3. Agendamento
      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          professionalId,
          serviceId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: 'SCHEDULED',
          origin: 'ONLINE',
          notes,
        },
        include: {
          service: true,
          professional: { include: { user: true } },
        },
      })

      // 4. Criar Contact + Conversation na recepção (se tiver clinicId)
      if (clinicId) {
        let contact = await tx.contact.findFirst({ where: { email, clinicId } })
        if (!contact) {
          contact = await tx.contact.create({
            data: { clinicId, name, email, phone, patientId: patient.id },
          })
        }

        let conversation = await tx.conversation.findFirst({
          where: { contactId: contact.id, clinicId },
        })
        if (!conversation) {
          conversation = await tx.conversation.create({
            data: {
              clinicId,
              contactId: contact.id,
              channel: 'CHAT',
              status: 'OPEN',
              lastMessageAt: new Date(),
            },
          })
        }

        // Mensagem automática informando o agendamento
        const proName = appointment.professional.user.name
        const serviceName = appointment.service.name
        const dateStr = new Date(startTime).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
        await tx.externalMessage.create({
          data: {
            conversationId: conversation.id,
            direction: 'IN',
            type: 'TEXT',
            content: `✅ Consulta agendada! Serviço: ${serviceName} | Profissional: ${proName} | Data: ${dateStr}`,
          },
        })

        await tx.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
        })
      }

      return appointment
    })

    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

export default r
