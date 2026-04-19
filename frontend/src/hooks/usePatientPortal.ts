import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

const PATIENT_TOKEN_KEY = 'patient_token'
const PATIENT_USER_KEY = 'patient_user'
const PATIENT_AUTH_EVENT = 'patient-auth-changed'

function notifyPatientAuthChanged() {
  window.dispatchEvent(new CustomEvent(PATIENT_AUTH_EVENT))
}

function handlePatientUnauthorized(error: unknown): never {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 401) {
    clearPatient()
  }
  throw error
}

export function getPatientToken(): string | null {
  return localStorage.getItem(PATIENT_TOKEN_KEY)
}

export function getPatientUser(): { id: string; name: string; email: string } | null {
  const raw = localStorage.getItem(PATIENT_USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearPatient() {
  localStorage.removeItem(PATIENT_TOKEN_KEY)
  localStorage.removeItem(PATIENT_USER_KEY)
  notifyPatientAuthChanged()
}

export function useRegisterPatient() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; cpf?: string; phone?: string }) => {
      const { data: res } = await api.post('/public/patients/register', data)
      return res as { message: string; email: string }
    }
  })
}

export function usePatientLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await api.post('/public/patients/login', { email, password })
      const res = data as { token: string; user: { id: string; name: string; email: string } }
      localStorage.setItem(PATIENT_TOKEN_KEY, res.token)
      localStorage.setItem(PATIENT_USER_KEY, JSON.stringify(res.user))
      notifyPatientAuthChanged()
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] })
      queryClient.invalidateQueries({ queryKey: ['patientConversation'] })
    }
  })
}

export interface PatientAppointment {
  id: string
  startTime: string
  endTime: string
  status: string
  cancellationSource?: string
  notes?: string
  service: { name: string; duration: number; onlineBooking?: boolean }
  professional: { user: { name: string; avatarUrl?: string } }
  review?: { rating: number; comment?: string } | null
}

export function usePatientAppointments() {
  return useQuery<PatientAppointment[]>({
    queryKey: ['patientAppointments'],
    queryFn: async () => {
      const token = getPatientToken()
      try {
        const { data } = await api.get('/public/patients/appointments', {
          headers: { Authorization: `Bearer ${token}` }
        })
        return data as PatientAppointment[]
      } catch (error) {
        handlePatientUnauthorized(error)
      }
    },
    enabled: !!getPatientToken(),
    retry: false,
  })
}

export interface PatientMessage {
  id: string
  direction: string
  content: string
  isRead: boolean
  source?: string
  createdAt: string
}

export interface PatientConversation {
  conversation: { id: string; status: string }
  messages: PatientMessage[]
}

export function usePatientConversation() {
  return useQuery<PatientConversation>({
    queryKey: ['patientConversation'],
    queryFn: async () => {
      const token = getPatientToken()
      try {
        const { data } = await api.get('/public/patients/conversation', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const res = data as { messages: PatientMessage[] }
        return {
          conversation: { id: 'patient', status: 'OPEN' },
          messages: res.messages || [],
        }
      } catch (error) {
        handlePatientUnauthorized(error)
      }
    },
    enabled: !!getPatientToken(),
    refetchInterval: 5_000, // poll every 5s while on screen
    retry: false,
  })
}

export function useSendPatientMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const token = getPatientToken()
      try {
        const { data } = await api.post(
          '/public/patients/message',
          { content },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        return data as PatientMessage
      } catch (error) {
        handlePatientUnauthorized(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientConversation'] })
    }
  })
}

export function useSubmitReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ appointmentId, rating, comment }: { appointmentId: string; rating: number; comment?: string }) => {
      const token = getPatientToken()
      try {
        const { data } = await api.post(
          `/public/patients/appointments/${appointmentId}/review`,
          { rating, comment },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        return data as { message: string; rating: number; comment?: string }
      } catch (error) {
        handlePatientUnauthorized(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] })
    }
  })
}

export function useCancelPatientAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const token = getPatientToken()
      try {
        await api.post(
          `/public/patients/appointments/${appointmentId}/cancel`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } catch (error) {
        handlePatientUnauthorized(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] })
    }
  })
}

export function subscribeToPatientAuthChange(listener: () => void) {
  window.addEventListener(PATIENT_AUTH_EVENT, listener)
  return () => window.removeEventListener(PATIENT_AUTH_EVENT, listener)
}
