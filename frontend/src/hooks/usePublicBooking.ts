import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'

export interface BookingData {
  name: string
  email: string
  password?: string
  cpf: string
  phone: string
  serviceId: string
  professionalId: string
  startTime: string
  endTime: string
  notes?: string
}

// NOTE: backend has no /api/public/book endpoint yet. Until it's implemented,
// surface a clear error message instead of a silent 404.
export function usePublicBooking() {
  return useMutation({
    mutationFn: async (bookingData: BookingData) => {
      try {
        const { data } = await api.post('/public/book', bookingData)
        return data
      } catch (err: any) {
        if (err?.response?.status === 404) {
          throw new Error('Agendamento público ainda não implementado no backend.')
        }
        throw err
      }
    }
  })
}
