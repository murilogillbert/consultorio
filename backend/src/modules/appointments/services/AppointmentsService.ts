import { AppointmentsRepository } from '../../patients/repositories/PatientsRepository'
import { Appointment, Prisma } from '@prisma/client'
import { AppError } from '../../../shared/errors/AppError'

export class AppointmentsService {
  private appointmentsRepository: AppointmentsRepository

  constructor(appointmentsRepository: AppointmentsRepository) {
    this.appointmentsRepository = appointmentsRepository
  }

  async executeList(start: Date, end: Date): Promise<Appointment[]> {
    return this.appointmentsRepository.findInRange(start, end)
  }

  async executeCreate(data: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment> {
    // 1. Create the appointment
    const appointment = await this.appointmentsRepository.create(data as any)

    // 2. [Advanced Logic] Check if service requires equipment
    const { ServiceEquipmentRepository } = await import('../../equipment/repositories/EquipmentRepository')
    const serviceEquipmentRepo = new ServiceEquipmentRepository()
    const equipments = await serviceEquipmentRepo.findByService(data.serviceId)

    if (equipments.length > 0) {
      const { EquipmentUsageRepository } = await import('../../equipment/repositories/EquipmentRepository')
      const usageRepo = new EquipmentUsageRepository()
      for (const se of equipments) {
        await usageRepo.create({
          equipment: { connect: { id: se.equipmentId } },
          appointment: { connect: { id: appointment.id } },
          room: { connect: { id: appointment.roomId || 'DEFAULT' } },
          usedBy: { connect: { id: appointment.professionalId || 'SYSTEM' } },
          origin: 'AUTOMATIC',
          startsAt: appointment.startTime,
          endsAt: appointment.endTime,
          status: 'SCHEDULED'
        })
      }
    }

    return appointment
  }

  async executeUpdate(id: string, data: Prisma.AppointmentUpdateInput): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findById(id)
    if (!appointment) {
      throw new AppError('Agendamento não encontrado', 404)
    }
    return this.appointmentsRepository.update(id, data)
  }

  async executeCancel(id: string, reason: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findById(id)
    if (!appointment) {
      throw new AppError('Agendamento não encontrado', 404)
    }
    return this.appointmentsRepository.update(id, { 
      status: 'CANCELLED',
      cancellationReason: reason
    })
  }
}
