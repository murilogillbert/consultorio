import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'

export interface BookingData {
  name: string
  email: string
  cpf: string
  phone: string
  serviceId: string
  professionalId: string
  startTime: string
  endTime: string
  notes?: string
}

export function usePublicBooking() {
  return useMutation({
    mutationFn: async (bookingData: BookingData) => {
      const { data } = await api.post('/public/book', bookingData)
      return data
    }
  })
}
