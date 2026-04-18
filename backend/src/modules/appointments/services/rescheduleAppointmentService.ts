import { AppointmentsService } from './AppointmentsService'
import { AppointmentsRepository } from '../../patients/repositories/PatientsRepository'
import { RescheduleAppointmentDto } from '../dtos/rescheduleAppointmentDto'

export async function rescheduleAppointmentService(id: string, dto: RescheduleAppointmentDto) {
  const service = new AppointmentsService(new AppointmentsRepository())
  const data: any = {
    startTime: new Date(dto.startTime),
    endTime: new Date(dto.endTime),
  }
  if (dto.professionalId) data.professionalId = dto.professionalId
  if (dto.roomId) data.roomId = dto.roomId
  return service.executeUpdate(id, data)
}
