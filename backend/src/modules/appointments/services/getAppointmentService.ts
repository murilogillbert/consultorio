import { AppointmentsRepository as PatientsAppointmentsRepository } from '../../patients/repositories/PatientsRepository'
import { AppError } from '../../../shared/errors/AppError'

export async function getAppointmentService(id: string) {
  const repo = new PatientsAppointmentsRepository()
  const appt = await repo.findById(id)
  if (!appt) throw new AppError('Agendamento não encontrado', 404)
  return appt
}
