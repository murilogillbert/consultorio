import { AppError } from '../../../shared/errors/AppError'
import { CreateAppointmentDto } from '../dtos/createAppointmentDto'
import { RescheduleAppointmentDto } from '../dtos/rescheduleAppointmentDto'

export function validateCreateAppointment(dto: Partial<CreateAppointmentDto>): void {
  if (!dto.patientId) throw new AppError('patientId é obrigatório', 400)
  if (!dto.professionalId) throw new AppError('professionalId é obrigatório', 400)
  if (!dto.serviceId) throw new AppError('serviceId é obrigatório', 400)
  if (!dto.startTime) throw new AppError('startTime é obrigatório', 400)
  if (!dto.endTime) throw new AppError('endTime é obrigatório', 400)

  const start = new Date(dto.startTime)
  const end = new Date(dto.endTime)

  if (isNaN(start.getTime())) throw new AppError('startTime inválido', 400)
  if (isNaN(end.getTime())) throw new AppError('endTime inválido', 400)
  if (start >= end) throw new AppError('startTime deve ser anterior a endTime', 400)
  if (start < new Date()) throw new AppError('Não é possível agendar no passado', 400)
}

export function validateReschedule(dto: Partial<RescheduleAppointmentDto>): void {
  if (!dto.startTime) throw new AppError('startTime é obrigatório', 400)
  if (!dto.endTime) throw new AppError('endTime é obrigatório', 400)

  const start = new Date(dto.startTime)
  const end = new Date(dto.endTime)

  if (isNaN(start.getTime())) throw new AppError('startTime inválido', 400)
  if (isNaN(end.getTime())) throw new AppError('endTime inválido', 400)
  if (start >= end) throw new AppError('startTime deve ser anterior a endTime', 400)
}
