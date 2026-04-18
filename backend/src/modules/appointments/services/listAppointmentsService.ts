import { AppointmentsRepository as PatientsAppointmentsRepository } from '../../patients/repositories/PatientsRepository'

export async function listAppointmentsService(start: string, end: string) {
  const repo = new PatientsAppointmentsRepository()
  return repo.findInRange(new Date(start), new Date(end))
}
