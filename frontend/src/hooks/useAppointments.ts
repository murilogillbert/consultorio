import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend AppointmentResponseDto:
// { id, startTime, endTime, status, notes, createdAt,
//   service: { id, name, duration, color },
//   insurancePlan?: { id, name, price, showPrice },
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
  cancellationSource?: string | null
  cancelledAt?: string | null
  service: { id: string; name: string; duration: number; color?: string; price?: number; onlineBooking?: boolean }
  insurancePlan?: { id: string; name: string; price?: number | null; showPrice?: boolean }
  patient: { id: string; name: string; avatarUrl?: string }
  professional: { id: string; name: string; avatarUrl?: string }
  room?: { id: string; name: string } | null
  paymentStatus?: string | null
  paymentAmount?: number | null
  paymentMethod?: string | null
  paymentId?: string | null
}

export interface Appointment {
  id: string
  patientId: string
  professionalId: string
  serviceId: string
  insurancePlanId?: string
  startTime: string
  endTime: string
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string
  notes?: string
  patient?: { name: string; user?: { name: string } }
  service?: { name: string; price?: number; onlineBooking?: boolean }
  insurancePlan?: { id: string; name: string; price?: number | null; showPrice?: boolean }
  professional?: { user?: { name: string } }
  cancellationSource?: string
  cancelledAt?: string
  paymentStatus?: string
  paymentAmount?: number
  paymentMethod?: string
  paymentId?: string
}

function mapAppointment(a: AppointmentRaw): Appointment {
  return {
    id: a.id,
    patientId: a.patient.id,
    professionalId: a.professional.id,
    serviceId: a.service.id,
    insurancePlanId: a.insurancePlan?.id,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    notes: a.notes,
    patient: { name: a.patient.name, user: { name: a.patient.name } },
    service: { name: a.service.name, price: a.service.price, onlineBooking: a.service.onlineBooking },
    insurancePlan: a.insurancePlan ? { id: a.insurancePlan.id, name: a.insurancePlan.name, price: a.insurancePlan.price, showPrice: a.insurancePlan.showPrice } : undefined,
    professional: { user: { name: a.professional.name } },
    cancellationSource: a.cancellationSource ?? undefined,
    cancelledAt: a.cancelledAt ?? undefined,
    paymentStatus: a.paymentStatus ?? undefined,
    paymentAmount: a.paymentAmount ?? undefined,
    paymentMethod: a.paymentMethod ?? undefined,
    paymentId: a.paymentId ?? undefined,
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
        insurancePlanId: appointmentData.insurancePlanId,
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
