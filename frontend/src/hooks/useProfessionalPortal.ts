/**
 * Hooks do Portal do Profissional
 *
 * Usa o token JWT padrão do AuthContext (armazenado em @Consultorio:token).
 * O backend valida o token e extrai o professionalId a partir do claim JWT.
 * Endpoints: /api/professional-portal/*  [Authorize(Roles = "PROFESSIONAL")]
 */
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

// ─── Agenda ────────────────────────────────────────────────────────────────
export interface PortalAppointment {
  id: string
  startTime: string
  endTime: string
  status: string
  notes?: string
  patient: { id: string; name: string; avatarUrl?: string }
  service: {
    id: string
    name: string
    durationMinutes: number
    price: number
    color: string
  }
  payment?: { status: string; amount: number; method?: string } | null
}

export interface AgendaData {
  weekStart: string
  weekEnd: string
  appointments: PortalAppointment[]
}

export function useProfessionalAgenda(startDate?: string) {
  return useQuery<AgendaData>({
    queryKey: ['professional-portal', 'agenda', startDate ?? 'current'],
    queryFn: async () => {
      const params = startDate ? `?startDate=${startDate}` : ''
      const { data } = await api.get(`/professional-portal/agenda${params}`)
      return data as AgendaData
    },
  })
}

// ─── Avaliações ────────────────────────────────────────────────────────────
export interface ReviewItem {
  id: string
  rating: number
  comment?: string
  createdAt: string
  appointmentId?: string
  patient: { name: string; avatarUrl?: string }
}

export interface ReviewsData {
  totalReviews: number
  averageRating: number
  distribution: Array<{ star: number; count: number }>
  reviews: ReviewItem[]
}

export function useProfessionalReviews() {
  return useQuery<ReviewsData>({
    queryKey: ['professional-portal', 'reviews'],
    queryFn: async () => {
      const { data } = await api.get('/professional-portal/reviews')
      return data as ReviewsData
    },
  })
}

// ─── Convênios ─────────────────────────────────────────────────────────────
export interface InsuranceStatsData {
  totalAppointments: number
  totalWithInsurance: number
  withoutInsurance: number
  insurancePlans: Array<{ id: string; name: string; count: number; percentage: number }>
}

export function useProfessionalInsuranceStats(filters?: { patientId?: string; serviceId?: string }) {
  return useQuery<InsuranceStatsData>({
    queryKey: ['professional-portal', 'insurance-stats', filters?.patientId ?? '', filters?.serviceId ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.patientId) params.append('patientId', filters.patientId)
      if (filters?.serviceId) params.append('serviceId', filters.serviceId)
      const qs = params.toString()
      const { data } = await api.get(`/professional-portal/insurance-stats${qs ? `?${qs}` : ''}`)
      return data as InsuranceStatsData
    },
  })
}

// ─── Filtros (pacientes e serviços já atendidos) ───────────────────────────
export interface PortalFiltersData {
  patients: Array<{ id: string; name: string }>
  services: Array<{ id: string; name: string }>
}

export function useProfessionalPortalFilters() {
  return useQuery<PortalFiltersData>({
    queryKey: ['professional-portal', 'filters'],
    queryFn: async () => {
      const { data } = await api.get('/professional-portal/filters')
      return data as PortalFiltersData
    },
  })
}

// ─── Alertas ───────────────────────────────────────────────────────────────
export interface AlertMessage {
  id: string
  content: string
  createdAt: string
  channelId: string
  sender: { name: string }
}

export function useProfessionalAlerts() {
  return useQuery<AlertMessage[]>({
    queryKey: ['professional-portal', 'alerts'],
    queryFn: async () => {
      const { data } = await api.get('/professional-portal/alerts')
      return data as AlertMessage[]
    },
    refetchInterval: 10000,
  })
}

// ─── Ganhos ────────────────────────────────────────────────────────────────
export interface EarningItem {
  id: string
  startTime: string
  patientName: string
  serviceName: string
  servicePrice: number
  paidAmount: number
  commission: number
  earning: number
  paymentStatus: string
}

export interface EarningsData {
  year: number
  month: number
  commission: number
  professionalName: string
  totalCompleted: number
  totalGross: number
  totalEarnings: number
  appointments: EarningItem[]
  monthlyHistory: Array<{
    year: number
    month: number
    label: string
    gross: number
    earning: number
    count: number
  }>
}

export function useProfessionalEarnings(
  year?: number,
  month?: number,
  filters?: { patientId?: string; serviceId?: string },
) {
  return useQuery<EarningsData>({
    queryKey: ['professional-portal', 'earnings', year, month, filters?.patientId ?? '', filters?.serviceId ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (year)  params.append('year',  String(year))
      if (month) params.append('month', String(month))
      if (filters?.patientId) params.append('patientId', filters.patientId)
      if (filters?.serviceId) params.append('serviceId', filters.serviceId)
      const qs = params.toString()
      const { data } = await api.get(`/professional-portal/earnings${qs ? `?${qs}` : ''}`)
      return data as EarningsData
    },
  })
}
