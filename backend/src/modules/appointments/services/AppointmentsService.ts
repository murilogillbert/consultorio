import { AppointmentsRepository } from '../../patients/repositories/PatientsRepository'
import { Appointment, Prisma } from '@prisma/client'
import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export class AppointmentsService {
  private appointmentsRepository: AppointmentsRepository

  constructor(appointmentsRepository: AppointmentsRepository) {
    this.appointmentsRepository = appointmentsRepository
  }

  async executeList(start: Date, end: Date): Promise<Appointment[]> {
    return this.appointmentsRepository.findInRange(start, end)
  }

  /**
   * Validate that the professional is available per their schedule,
   * and there are no conflicts with the professional, room, or required equipment.
   */
  private async validateConflicts(
    professionalId: string,
    startTime: Date,
    endTime: Date,
    roomId?: string | null,
    serviceId?: string,
    excludeAppointmentId?: string
  ): Promise<void> {
    // 1. Check professional schedule (is this day/time within their working hours?)
    const dayOfWeek = startTime.getDay()
    const schedules = await prisma.schedule.findMany({
      where: { professionalId, active: true, dayOfWeek }
    })
    if (schedules.length > 0) {
      const slotStart = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`
      const slotEnd = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`
      const withinSchedule = schedules.some(s => s.startTime <= slotStart && s.endTime >= slotEnd)
      if (!withinSchedule) {
        throw new AppError('O profissional não atende neste horário', 400)
      }
    }

    // 2. Check professional conflict (another appointment at the same time)
    const profConflict = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { notIn: ['CANCELLED'] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {})
      }
    })
    if (profConflict) {
      throw new AppError('O profissional já possui um agendamento neste horário', 400)
    }

    // 3. Check room conflict
    if (roomId) {
      const roomConflict = await prisma.appointment.findFirst({
        where: {
          roomId,
          status: { notIn: ['CANCELLED'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {})
        }
      })
      if (roomConflict) {
        throw new AppError('A sala já está ocupada neste horário', 400)
      }
    }

    // 4. Check equipment conflicts
    if (serviceId) {
      const serviceEquipments = await prisma.serviceEquipment.findMany({
        where: { serviceId },
        include: { equipment: true }
      })
      for (const se of serviceEquipments) {
        // Count how many units of this equipment type exist
        const totalUnits = await prisma.equipment.count({
          where: { category: se.equipment.category, status: 'AVAILABLE' }
        })

        // Count how many are already booked in this time range
        const bookedCount = await prisma.equipmentUsage.count({
          where: {
            equipment: { category: se.equipment.category },
            status: { in: ['SCHEDULED', 'ACTIVE'] },
            startsAt: { lt: endTime },
            endsAt: { gt: startTime }
          }
        })

        if (bookedCount >= totalUnits) {
          throw new AppError(`Equipamento "${se.equipment.name}" não disponível neste horário (${bookedCount}/${totalUnits} em uso)`, 400)
        }
      }
    }
  }

  async executeCreate(data: Prisma.AppointmentUncheckedCreateInput & { repeat?: boolean }): Promise<Appointment> {
    const { repeat, ...appointmentData } = data

    // Validate conflicts before creating
    await this.validateConflicts(
      appointmentData.professionalId,
      new Date(appointmentData.startTime),
      new Date(appointmentData.endTime),
      appointmentData.roomId,
      appointmentData.serviceId
    )

    // Marca a série de recorrência (se aplicável) para permitir o
    // cancelamento futuro de todos os agendamentos relacionados.
    let recurrenceGroupId: string | null = null
    if (repeat) {
      // Usa crypto.randomUUID quando disponível; fallback simples caso contrário.
      try {
        const { randomUUID } = await import('crypto')
        recurrenceGroupId = randomUUID()
      } catch {
        recurrenceGroupId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      }
    }

    const baseData: any = { ...appointmentData }
    if (recurrenceGroupId) baseData.recurrenceGroupId = recurrenceGroupId

    // 1. Create the main appointment
    const mainAppointment = await this.appointmentsRepository.create(baseData)
    await this.handleEquipmentUsage(mainAppointment)

    // 2. Handle recurrence (90 days = ~13 weeks)
    if (repeat) {
      for (let i = 1; i <= 12; i++) {
        const nextStart = new Date(mainAppointment.startTime)
        nextStart.setDate(nextStart.getDate() + (i * 7))

        const nextEnd = new Date(mainAppointment.endTime)
        nextEnd.setDate(nextEnd.getDate() + (i * 7))

        // Validate conflicts for each recurring instance
        try {
          await this.validateConflicts(
            appointmentData.professionalId,
            nextStart,
            nextEnd,
            appointmentData.roomId,
            appointmentData.serviceId
          )
        } catch {
          // Skip this week if there's a conflict (don't block the whole series)
          continue
        }

        const recurringAppt = await this.appointmentsRepository.create({
          ...appointmentData,
          startTime: nextStart,
          endTime: nextEnd,
          recurrenceGroupId,
        } as any)

        await this.handleEquipmentUsage(recurringAppt)
      }
    }

    return mainAppointment
  }

  private async handleEquipmentUsage(appointment: Appointment) {
    // [Advanced Logic] Check if service requires equipment
    const { ServiceEquipmentRepository } = await import('../../equipment/repositories/EquipmentRepository')
    const serviceEquipmentRepo = new ServiceEquipmentRepository()
    const equipments = await serviceEquipmentRepo.findByService(appointment.serviceId)

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
  }

  async executeUpdate(id: string, data: Prisma.AppointmentUpdateInput): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findById(id)
    if (!appointment) {
      throw new AppError('Agendamento não encontrado', 404)
    }
    return this.appointmentsRepository.update(id, data)
  }

  async executeUpdateStatus(id: string, status: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findById(id)
    if (!appointment) {
      throw new AppError('Agendamento não encontrado', 404)
    }

    const data: Prisma.AppointmentUpdateInput = { status: status as any }
    
    // Automatically set checkinAt when confirmed
    if (status === 'CONFIRMED') {
      data.checkinAt = new Date()
      
      // Trigger WhatsApp Notification
      this.notifyConfirmation(id).catch(err => console.error('Error sending WA confirmation:', err))
    }

    return this.appointmentsRepository.update(id, data)
  }

  private async notifyConfirmation(appointmentId: string) {
    const appointment = await this.appointmentsRepository.findById(appointmentId) as any
    if (!appointment || !appointment.patient?.phone) return

    const clinicId = (appointment.service as any).clinicId
    const { ClinicRepository } = await import('../../clinic/repositories/ClinicRepository')
    const clinicRepo = new ClinicRepository()
    const settings = await clinicRepo.findIntegrationsByClinic(clinicId)

    if (settings && settings.waConnected && settings.waAccessToken && settings.waPhoneNumberId) {
      const { WhatsappAdapter } = await import('../../messaging/channels/whatsapp/whatsappAdapter')
      const { whatsappTemplates } = await import('../../messaging/channels/whatsapp/whatsappTemplates')
      
      const adapter = new WhatsappAdapter(settings.waAccessToken, settings.waPhoneNumberId)
      const patientName = appointment.patient.user.name
      const date = new Date(appointment.startTime).toLocaleDateString('pt-BR')
      const time = new Date(appointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const professionalName = appointment.professional.user.name

      await adapter.sendTemplateMessage(
        appointment.patient.phone.replace(/\D/g, ''),
        'appointment_confirmation',
        'pt_BR',
        whatsappTemplates.appointment_confirmation(patientName, date, time, professionalName)
      )
    }
  }

  async executeCancel(id: string, reason: string, source: string = 'RECEPTION'): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findById(id)
    if (!appointment) {
      throw new AppError('Agendamento não encontrado', 404)
    }
    return this.appointmentsRepository.update(id, {
      status: 'CANCELLED',
      cancellationReason: reason,
      cancellationSource: source,
      cancelledAt: new Date(),
    })
  }
}
