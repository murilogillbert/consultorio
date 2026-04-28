import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend AppointmentResponseDto:
//   { id, startTime, endTime, status, notes, createdAt,
//     appointmentType, patientConfirmation, recurrenceGroupId,
//     service: { id, name, duration, color },
//     insurancePlan?: { id, name, price, showPrice },
//     patient: { id, name, avatarUrl },
//     professional: { id, name, avatarUrl },
//     room?: { id, name } }
interface AppointmentRaw {
  id: string
  startTime: string
  endTime: string
  status: string
  notes?: string
  createdAt: string
  appointmentType?: string
  patientConfirmation?: string
  recurrenceGroupId?: string | null
  cancellationSource?: string | null
  cancelledAt?: string | null
  service: { id: string; name: string; duration: number; color?: string; price?: number; showPrice?: boolean; onlineBooking?: boolean }
  insurancePlan?: { id: string; name: string; price?: number | null; showPrice?: boolean }
  patient: { id: string; name: string; avatarUrl?: string }
  professional: { id: string; name: string; avatarUrl?: string }
  room?: { id: string; name: string } | null
  paymentStatus?: string | null
  paymentAmount?: number | null
  paymentMethod?: string | null
  paymentId?: string | null
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | string

export type AppointmentType = 'ONLINE' | 'IN_PERSON' | string

export type PatientConfirmation = 'PENDING' | 'CONFIRMED' | 'NOT_CONFIRMED' | string

export interface Appointment {
  id: string
  patientId: string
  professionalId: string
  serviceId: string
  insurancePlanId?: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes?: string
  appointmentType?: AppointmentType
  patientConfirmation?: PatientConfirmation
  recurrenceGroupId?: string
  patient?: { name: string; user?: { name: string } }
  service?: { id?: string; name: string; price?: number; showPrice?: boolean; onlineBooking?: boolean }
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
    appointmentType: a.appointmentType ?? 'IN_PERSON',
    patientConfirmation: a.patientConfirmation ?? 'PENDING',
    recurrenceGroupId: a.recurrenceGroupId ?? undefined,
    patient: { name: a.patient.name, user: { name: a.patient.name } },
    service: { id: a.service.id, name: a.service.name, price: a.service.price, showPrice: a.service.showPrice ?? true, onlineBooking: a.service.onlineBooking },
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

export interface CreateAppointmentInput {
  patientId: string
  professionalId: string
  serviceId: string
  roomId?: string
  insurancePlanId?: string
  startTime: string
  endTime: string
  notes?: string
  origin?: string
  appointmentType?: AppointmentType
  patientConfirmation?: PatientConfirmation
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (appointmentData: CreateAppointmentInput) => {
      const payload = {
        patientId: appointmentData.patientId,
        professionalId: appointmentData.professionalId,
        serviceId: appointmentData.serviceId,
        insurancePlanId: appointmentData.insurancePlanId,
        roomId: appointmentData.roomId,
        startTime: appointmentData.startTime,
        notes: appointmentData.notes,
        appointmentType: appointmentData.appointmentType,
        patientConfirmation: appointmentData.patientConfirmation,
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

// Atualiza apenas a confirmação de presença do paciente (independente do status)
export function useUpdatePatientConfirmation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: PatientConfirmation }) => {
      // C# expõe via PATCH /appointments/{id}/confirmation com { status }
      // Node.js expõe a mesma rota com { value }. Mandamos os dois para
      // funcionar em ambos os backends sem if/else.
      const { data } = await api.patch<AppointmentRaw>(`/appointments/${id}/confirmation`, { status: value, value })
      return mapAppointment(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  })
}

export interface UpdateAppointmentInput {
  id: string
  status?: string
  patientId?: string
  professionalId?: string
  serviceId?: string
  roomId?: string | null
  equipmentId?: string | null
  insurancePlanId?: string | null
  startTime?: string
  notes?: string
  appointmentType?: AppointmentType
  patientConfirmation?: PatientConfirmation
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateAppointmentInput) => {
      const { data } = await api.put<AppointmentRaw>(`/appointments/${id}`, rest)
      return mapAppointment(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  })
}

export interface RecurringAppointmentsInput {
  patientId: string
  professionalId: string
  serviceId: string
  roomId?: string
  insurancePlanId?: string
  startTime: string
  notes?: string
  durationDays?: number
  appointmentType?: AppointmentType
}

export interface RecurringAppointmentsResult {
  created: number
  skipped: number
  createdDates: string[]
  skippedDates: string[]
  message: string
}

export function useCreateRecurringAppointments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RecurringAppointmentsInput): Promise<RecurringAppointmentsResult> => {
      const { data } = await api.post<RecurringAppointmentsResult>('/appointments/recurring', {
        ...input,
        durationDays: input.durationDays ?? 90,
      })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  })
}

export function useCancelAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason, source }: { id: string; reason: string; source?: string }) => {
      await api.patch(`/appointments/${id}/cancel`, { reason, source: source || 'RECEPTION' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  })
}

// Cancela este e todos os agendamentos futuros da mesma série de recorrência.
export function useCancelFutureAppointments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason, source }: { id: string; reason?: string; source?: string }) => {
      const { data } = await api.patch<{ count: number; message: string }>(`/appointments/${id}/cancel-future`, {
        reason,
        source: source || 'RECEPTION',
      })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  })
}
