export interface CreateAppointmentDto {
  patientId: string
  professionalId: string
  serviceId: string
  roomId?: string
  insurancePlanId?: string
  startTime: string
  endTime: string
  notes?: string
  origin?: string
  source?: string
  repeat?: boolean
}
