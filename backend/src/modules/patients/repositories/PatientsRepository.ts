import { prisma } from '../../../config/database'
import { Patient, Prisma, Appointment, Payment } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class PatientsRepository extends BaseRepository<Patient, Prisma.PatientCreateInput, Prisma.PatientUpdateInput> {
  constructor() {
    super(prisma.patient)
  }

  async findWithDetails(id: string): Promise<Patient | null> {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        user: true,
        appointments: { take: 5, orderBy: { startTime: 'desc' } }
      }
    })
  }

  async findByCpf(cpf: string): Promise<Patient | null> {
    return prisma.patient.findUnique({
      where: { cpf }
    })
  }

  async findByUserId(userId: string): Promise<Patient | null> {
    return prisma.patient.findUnique({
      where: { userId },
      include: { user: true }
    })
  }
}

export class AppointmentsRepository extends BaseRepository<Appointment, Prisma.AppointmentCreateInput, Prisma.AppointmentUpdateInput> {
  constructor() {
    super(prisma.appointment)
  }

  async findInRange(start: Date, end: Date): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lte: end }
      },
      include: {
        patient: { include: { user: true } },
        professional: { include: { user: true } },
        service: true,
        room: true
      },
      orderBy: { startTime: 'asc' }
    })
  }

  async findByPatient(patientId: string): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      where: { patientId },
      include: { service: true, professional: { include: { user: true } } },
      orderBy: { startTime: 'desc' }
    })
  }
}

export class PaymentsRepository extends BaseRepository<Payment, Prisma.PaymentCreateInput, Prisma.PaymentUpdateInput> {
  constructor() {
    super(prisma.payment)
  }

  async findByAppointment(appointmentId: string): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' }
    })
  }

  async listPending(): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: { appointment: { include: { patient: { include: { user: true } } } } },
      orderBy: { dueAt: 'asc' }
    })
  }
}
