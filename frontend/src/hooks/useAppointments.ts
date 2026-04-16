import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend AppointmentResponseDto:
// { id, startTime, endTime, status, notes, createdAt,
//   service: { id, name, duration, color },
//   patient: { id, name, avatarUrl },
//   professional: { id, name, avatarUrl },
//   room?: { id, name } }
interface AppointmentRaw {
  id: string
  startTime: string
  endTime: string
  status: string
  notes?: string
  createdAt: string
  service: { id: string; name: string; duration: number; color?: string; price?: number }
  patient: { id: string; name: string; avatarUrl?: string }
  professional: { id: string; name: string; avatarUrl?: string }
  room?: { id: string; name: string } | null
}

export interface Appointment {
  id: string
  patientId: string
  professionalId: string
  serviceId: string
  startTime: string
  endTime: string
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string
  notes?: string
  patient?: { name: string; user?: { name: string } }
  service?: { name: string; price?: number }
  professional?: { user?: { name: string } }
}

function mapAppointment(a: AppointmentRaw): Appointment {
  return {
    id: a.id,
    patientId: a.patient.id,
    professionalId: a.professional.id,
    serviceId: a.service.id,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    notes: a.notes,
    patient: { name: a.patient.name, user: { name: a.patient.name } },
    service: { name: a.service.name, price: a.service.price },
    professional: { user: { name: a.professional.name } },
  }
}

export function useAppointments(start: string, end: string) {
  return useQuery({
    queryKey: ['appointments', start, end],
    queryFn: async () => {
      const { data } = await api.get<AppointmentRaw[]>('/appointments', {
        params: { start, end }
      })
      return data.map(mapAppointment)
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
      const payload = {
        patientId: appointmentData.patientId,
        professionalId: appointmentData.professionalId,
        serviceId: appointmentData.serviceId,
        roomId: appointmentData.roomId,
        startTime: appointmentData.startTime,
        notes: appointmentData.notes,
      }
      const { data } = await api.post<AppointmentRaw>('/appointments', payload)
      return mapAppointment(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  })
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch<AppointmentRaw>(`/appointments/${id}/status`, { status })
      return mapAppointment(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  })
}

export function useCancelAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.patch(`/appointments/${id}/cancel`, { reason })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  })
}
