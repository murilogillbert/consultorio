import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

const PRO_TOKEN_KEY = 'professional_token'
const PRO_USER_KEY = 'professional_user'

export function getProfessionalToken(): string | null {
  return localStorage.getItem(PRO_TOKEN_KEY)
}

export function getProfessionalUser(): { id: string; name: string; email: string } | null {
  const raw = localStorage.getItem(PRO_USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearProfessional() {
  localStorage.removeItem(PRO_TOKEN_KEY)
  localStorage.removeItem(PRO_USER_KEY)
}

export function isProfessionalLoggedIn(): boolean {
  return !!getProfessionalToken()
}

// Reutiliza o endpoint de login de paciente — que agora detecta se é profissional
export function useProfessionalLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await api.post('/public/patients/login', { email, password })
      const res = data as { token: string; role: string; user: { id: string; name: string; email: string } }
      if (res.role !== 'PROFESSIONAL') {
        throw new Error('Estas credenciais não pertencem a um profissional.')
      }
      localStorage.setItem(PRO_TOKEN_KEY, res.token)
      localStorage.setItem(PRO_USER_KEY, JSON.stringify(res.user))
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proMe'] })
      queryClient.invalidateQueries({ queryKey: ['proAgenda'] })
      queryClient.invalidateQueries({ queryKey: ['proReviews'] })
      queryClient.invalidateQueries({ queryKey: ['proStats'] })
    }
  })
}

function proApi() {
  const token = getProfessionalToken()
  return {
    get: <T>(url: string, params?: Record<string, string>) =>
      api.get<T>(url, { headers: { Authorization: `Bearer ${token}` }, params }),
  }
}

export function useProfessionalMe() {
  return useQuery({
    queryKey: ['proMe'],
    queryFn: async () => {
      const { data } = await proApi().get<{
        id: string; name: string; email: string
        avatarUrl?: string; specialty?: string; commissionPct: number
      }>('/public/professional/me')
      return data
    },
    enabled: isProfessionalLoggedIn(),
  })
}

export interface ProAppointment {
  id: string
  startTime: string
  endTime: string
  status: string
  cancellationSource?: string
  patientName: string
  patientAvatarUrl?: string
  serviceName: string
  serviceOnlineBooking?: boolean
  roomName?: string
  price: number
  paymentStatus: string
}

export function useProfessionalAgenda(weekStart?: string) {
  return useQuery({
    queryKey: ['proAgenda', weekStart],
    queryFn: async () => {
      const params: Record<string, string> | undefined = weekStart ? { weekStart } : undefined
      const { data } = await proApi().get<ProAppointment[]>('/public/professional/agenda', params)
      return data
    },
    enabled: isProfessionalLoggedIn(),
  })
}

export interface ProReviews {
  averageRating: number
  totalReviews: number
  reviews: Array<{
    id: string
    rating: number
    comment?: string
    createdAt: string
    patientName: string
    serviceName?: string
  }>
}

export function useProfessionalReviews() {
  return useQuery({
    queryKey: ['proReviews'],
    queryFn: async () => {
      const { data } = await proApi().get<ProReviews>('/public/professional/reviews')
      return data
    },
    enabled: isProfessionalLoggedIn(),
  })
}

export interface ProStats {
  totalAppointments: number
  completedCount: number
  cancelledCount: number
  scheduledCount: number
  totalRevenue: number
  commissionPct: number
  netPayout: number
  serviceBreakdown: Array<{ name: string; count: number; revenue: number }>
  insuranceBreakdown: Array<{ name: string; serviceCount: number }>
  periodLabel: string
}

export function useProfessionalStats(period?: string) {
  return useQuery({
    queryKey: ['proStats', period],
    queryFn: async () => {
      const params: Record<string, string> | undefined = period ? { period } : undefined
      const { data } = await proApi().get<ProStats>('/public/professional/stats', params)
      return data
    },
    enabled: isProfessionalLoggedIn(),
  })
}
