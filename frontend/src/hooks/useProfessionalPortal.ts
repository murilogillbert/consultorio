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
    queryKey: ['professional-portal', 'agenda', startDate],
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
  insurancePlans: Array<{ name: string; count: number; percentage: number }>
}

export function useProfessionalInsuranceStats() {
  return useQuery<InsuranceStatsData>({
    queryKey: ['professional-portal', 'insurance-stats'],
    queryFn: async () => {
      const { data } = await api.get('/professional-portal/insurance-stats')
      return data as InsuranceStatsData
    },
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

export function useProfessionalEarnings(year?: number, month?: number) {
  return useQuery<EarningsData>({
    queryKey: ['professional-portal', 'earnings', year, month],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (year) params.append('year', String(year))
      if (month) params.append('month', String(month))
      const { data } = await api.get(`/professional-portal/earnings?${params.toString()}`)
      return data as EarningsData
    },
  })
}
