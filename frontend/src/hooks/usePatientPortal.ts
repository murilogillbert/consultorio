import { useQuery, useMutation } from '@tanstack/react-query'

// NOTE: backend does not expose a patient portal / OTP flow yet. All calls
// are stubbed until /api/public/patient/* endpoints are implemented.

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

export function useRequestOtp() {
  return useMutation({
    mutationFn: async (_email: string) => ({ message: 'Portal do paciente ainda não implementado.' })
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (_: { email: string; otp: string }) => ({
      token: '',
      user: { id: '', name: '', email: '' }
    })
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
    queryFn: async () => [],
    enabled: !!getPatientToken(),
    staleTime: Infinity,
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
  return useQuery<PatientConversation>({
    queryKey: ['patientConversation'],
    queryFn: async () => ({ conversation: null, messages: [] }),
    enabled: !!getPatientToken(),
    staleTime: Infinity,
  })
}

export function useSendPatientMessage() {
  return useMutation({
    mutationFn: async (_content: string) => ({})
  })
}
