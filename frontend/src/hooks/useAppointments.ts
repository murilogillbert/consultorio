import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface Appointment {
  id: string
  patientId: string
  professionalId: string
  serviceId: string
  startTime: string
  endTime: string
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  patient?: { name: string; user?: { name: string } }
  service?: { name: string }
  professional?: { user?: { name: string } }
}

export function useAppointments(start: string, end: string) {
  return useQuery({
    queryKey: ['appointments', start, end],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>('/appointments', {
        params: { start, end }
      })
      return data
    }
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (appointmentData: {
      patientId: string
      professionalId: string
      serviceId: string
      roomId?: string
      insurancePlanId?: string
      startTime: string
      endTime: string
      notes?: string
      origin?: string
    }) => {
      const { data } = await api.post('/appointments', appointmentData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    }
  })
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/appointments/${id}/status`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    }
  })
}

export function useCancelAppointment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.patch(`/appointments/${id}/cancel`, { reason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    }
  })
}
