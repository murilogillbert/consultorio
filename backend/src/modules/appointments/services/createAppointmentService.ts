import { AppointmentsService } from './AppointmentsService'
import { AppointmentsRepository } from '../../patients/repositories/PatientsRepository'
import { CreateAppointmentDto } from '../dtos/createAppointmentDto'

export async function createAppointmentService(dto: CreateAppointmentDto) {
  const service = new AppointmentsService(new AppointmentsRepository())
  return service.executeCreate({
    patientId: dto.patientId,
    professionalId: dto.professionalId,
    serviceId: dto.serviceId,
    roomId: dto.roomId,
    insurancePlanId: dto.insurancePlanId,
    startTime: new Date(dto.startTime),
    endTime: new Date(dto.endTime),
    notes: dto.notes,
    origin: dto.origin ?? 'MANUAL',
    source: dto.source,
    repeat: dto.repeat ?? false,
  })
}
