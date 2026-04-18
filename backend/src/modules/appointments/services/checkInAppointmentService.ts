import { AppointmentsService } from './AppointmentsService'
import { AppointmentsRepository } from '../../patients/repositories/PatientsRepository'

export async function checkInAppointmentService(id: string) {
  const service = new AppointmentsService(new AppointmentsRepository())
  return service.executeUpdateStatus(id, 'CONFIRMED')
}
