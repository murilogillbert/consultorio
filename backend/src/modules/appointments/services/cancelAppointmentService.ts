import { AppointmentsService } from './AppointmentsService'
import { AppointmentsRepository } from '../../patients/repositories/PatientsRepository'

export async function cancelAppointmentService(id: string, reason: string) {
  const service = new AppointmentsService(new AppointmentsRepository())
  return service.executeCancel(id, reason)
}
