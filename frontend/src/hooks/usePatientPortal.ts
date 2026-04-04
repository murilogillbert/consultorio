import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// ─── Token storage (separado do token de staff) ───────────────────────────

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

function savePatient(token: string, user: { id: string; name: string; email: string }) {
  localStorage.setItem(PATIENT_TOKEN_KEY, token)
  localStorage.setItem(PATIENT_USER_KEY, JSON.stringify(user))
}

export function clearPatient() {
  localStorage.removeItem(PATIENT_TOKEN_KEY)
  localStorage.removeItem(PATIENT_USER_KEY)
}

// ─── API helper com token de paciente ────────────────────────────────────

function patientApi() {
  const token = getPatientToken()
  return {
    get: <T>(url: string) =>
      api.get<T>(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data),
    post: <T>(url: string, data?: unknown) =>
      api.post<T>(url, data, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data),
  }
}

// ─── Hooks de autenticação ────────────────────────────────────────────────

export function useRequestOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post<{ message: string }>('/public/patient/request-otp', { email })
      return data
    },
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const { data } = await api.post<{ token: string; user: { id: string; name: string; email: string } }>(
        '/public/patient/verify-otp',
        { email, otp }
      )
      savePatient(data.token, data.user)
      return data
    },
  })
}

// ─── Hooks de dados do paciente ───────────────────────────────────────────

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
  const token = getPatientToken()
  return useQuery({
    queryKey: ['patientAppointments'],
    queryFn: () => patientApi().get<PatientAppointment[]>('/public/patient/appointments'),
    enabled: !!token,
    staleTime: 0,
  })
}

export interface PatientConversation {
  conversation: { id: string; status: string } | null
  messages: {
    id: string
    direction: string
    content: string
    createdAt: string
  }[]
}

export function usePatientConversation() {
  const token = getPatientToken()
  return useQuery({
    queryKey: ['patientConversation'],
    queryFn: () => patientApi().get<PatientConversation>('/public/patient/conversation'),
    enabled: !!token,
    refetchInterval: 8000,
    staleTime: 0,
  })
}

export function useSendPatientMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      patientApi().post('/public/patient/conversation/message', { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patientConversation'] })
    },
  })
}
