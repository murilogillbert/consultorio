import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

const PATIENT_TOKEN_KEY = 'patient_token'
const PATIENT_USER_KEY = 'patient_user'

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
}

export function useRegisterPatient() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; cpf?: string; phone?: string }) => {
      const { data: res } = await api.post('/public/patients/register', data)
      return res as { message: string; email: string }
    }
  })
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post('/public/patients/otp/request', { email })
      return data as { message: string }
    }
  })
}

export function useVerifyOtp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const { data } = await api.post('/public/patients/otp/verify', { email, otp })
      const res = data as { token: string; user: { id: string; name: string; email: string } }
      localStorage.setItem(PATIENT_TOKEN_KEY, res.token)
      localStorage.setItem(PATIENT_USER_KEY, JSON.stringify(res.user))
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
  notes?: string
  service: { name: string; duration: number }
  professional: { user: { name: string; avatarUrl?: string } }
}

export function usePatientAppointments() {
  return useQuery<PatientAppointment[]>({
    queryKey: ['patientAppointments'],
    queryFn: async () => {
      const token = getPatientToken()
      const { data } = await api.get('/public/patients/appointments', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return data as PatientAppointment[]
    },
    enabled: !!getPatientToken(),
  })
}

export interface PatientMessage {
  id: string
  direction: string
  content: string
  isRead: boolean
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
      const { data } = await api.get('/public/patients/conversation', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const res = data as { messages: PatientMessage[] }
      return {
        conversation: { id: 'patient', status: 'OPEN' },
        messages: res.messages || [],
      }
    },
    enabled: !!getPatientToken(),
  })
}

export function useSendPatientMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const token = getPatientToken()
      const { data } = await api.post(
        '/public/patients/message',
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return data as PatientMessage
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientConversation'] })
    }
  })
}

export function useCancelPatientAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const token = getPatientToken()
      await api.post(
        `/public/patients/appointments/${appointmentId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] })
    }
  })
}
