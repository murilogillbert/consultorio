export interface UpdateAppointmentDto {
  patientId?: string
  professionalId?: string
  serviceId?: string
  roomId?: string
  insurancePlanId?: string
  startTime?: string
  endTime?: string
  notes?: string
  status?: string
  origin?: string
  source?: string
}
