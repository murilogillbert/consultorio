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
  appointmentType?: string      // "ONLINE" | "IN_PERSON"
  patientConfirmation?: string  // "PENDING" | "CONFIRMED" | "NOT_CONFIRMED"
  repeat?: boolean
}
