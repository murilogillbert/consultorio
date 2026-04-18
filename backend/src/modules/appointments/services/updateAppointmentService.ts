import { AppointmentsService } from './AppointmentsService'
import { AppointmentsRepository } from '../../patients/repositories/PatientsRepository'
import { UpdateAppointmentDto } from '../dtos/updateAppointmentDto'

export async function updateAppointmentService(id: string, dto: UpdateAppointmentDto) {
  const service = new AppointmentsService(new AppointmentsRepository())
  const data: any = { ...dto }
  if (dto.startTime) data.startTime = new Date(dto.startTime)
  if (dto.endTime) data.endTime = new Date(dto.endTime)
  return service.executeUpdate(id, data)
}
