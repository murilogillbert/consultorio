import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import { getPatientToken } from './usePatientPortal'

export interface BookingData {
  name: string
  email: string
  password?: string
  cpf: string
  phone: string
  serviceId: string
  insurancePlanId?: string
  professionalId: string
  startTime: string
  endTime: string
  notes?: string
  /** "ONLINE" ou "IN_PERSON". Define se o atendimento será presencial ou online. */
  appointmentType?: string
}

export function usePublicBooking() {
  return useMutation({
    mutationFn: async (bookingData: BookingData) => {
      const patientToken = getPatientToken()

      const headers: Record<string, string> = {}
      if (patientToken) {
        // Send patient token so the backend reuses the existing account
        headers['Authorization'] = `Bearer ${patientToken}`
      }

      const { data } = await api.post('/public/book', bookingData, { headers })
      return data
    }
  })
}
