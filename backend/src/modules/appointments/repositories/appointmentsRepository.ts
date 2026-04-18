import { prisma } from '../../../config/database'
import { Appointment, Prisma } from '@prisma/client'

/**
 * Dedicated appointments repository (thin adapter over Prisma).
 * The AppointmentsRepository in patients/repositories/PatientsRepository.ts
 * is the legacy class; this is the new canonical one.
 */
export class AppointmentsRepository {
  async findById(id: string): Promise<Appointment | null> {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        professional: { include: { user: true } },
        service: true,
        room: true,
      },
    })
  }

  async findInRange(start: Date, end: Date): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lte: end },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        professional: { include: { user: { select: { name: true } } } },
        service: { select: { name: true, duration: true } },
        room: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    })
  }

  async findByPatient(patientId: string): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      where: { patientId },
      include: {
        professional: { include: { user: { select: { name: true } } } },
        service: { select: { name: true, duration: true } },
      },
      orderBy: { startTime: 'desc' },
    })
  }

  async findByProfessional(professionalId: string, start?: Date, end?: Date): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      where: {
        professionalId,
        ...(start && end ? { startTime: { gte: start }, endTime: { lte: end } } : {}),
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        service: { select: { name: true, duration: true } },
      },
      orderBy: { startTime: 'asc' },
    })
  }

  async create(data: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment> {
    return prisma.appointment.create({ data })
  }

  async update(id: string, data: Prisma.AppointmentUpdateInput): Promise<Appointment> {
    return prisma.appointment.update({ where: { id }, data })
  }

  async count(where?: Prisma.AppointmentWhereInput): Promise<number> {
    return prisma.appointment.count({ where })
  }
}
