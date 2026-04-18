import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend endpoints that actually exist:
//   GET /api/dashboard/summary
//   GET /api/dashboard/appointments-by-status
//   GET /api/dashboard/revenue-by-day?days=30
//   GET /api/dashboard/top-services
//   GET /api/dashboard/top-professionals
//
// The UI still expects legacy "metrics" shapes, so we adapt them here and
// provide safe defaults for the charts/alerts the backend doesn't compute.

export interface DashboardMetrics {
  metrics: {
    faturamentoMes: number
    faturamentoMudanca: number
    totalAgendamentos: number
    concluidosAgendamentos: number
    taxaOcupacao: number
    npsMedio: number
  }
  charts: {
    faturamentoAnual: { month: string; revenue: number }[]
    topServices: { name: string; count: number; revenue: number }[]
  }
  alertas: {
    type: 'danger' | 'warning' | 'success'
    text: string
    action: string
  }[]
}

interface SummaryRaw {
  appointmentsToday: number
  appointmentsThisMonth: number
  totalPatients: number
  totalProfessionals: number
  totalServices: number
  revenueThisMonth: number
  pendingPayments: number
}

export function useDashboardMetrics(_clinicId?: string, _period?: string, _startDate?: string, _endDate?: string) {
  return useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const [summaryRes, revenueRes, topRes] = await Promise.all([
        api.get<SummaryRaw>('/dashboard/summary'),
        api.get<Array<{ date: string; total: number }>>('/dashboard/revenue-by-day?days=365').catch(() => ({ data: [] as Array<{ date: string; total: number }> })),
        api.get<Array<{ serviceId: string; name: string; count: number }>>('/dashboard/top-services').catch(() => ({ data: [] as Array<{ serviceId: string; name: string; count: number }> })),
      ])

      const summary = summaryRes.data
      const revenue = revenueRes.data
      const top = topRes.data

      const byMonth = new Map<string, number>()
      for (const r of revenue) {
        const d = new Date(r.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        byMonth.set(key, (byMonth.get(key) || 0) + Number(r.total || 0))
      }

      return {
        metrics: {
          faturamentoMes: summary.revenueThisMonth || 0,
          faturamentoMudanca: 0,
          totalAgendamentos: summary.appointmentsThisMonth || 0,
          concluidosAgendamentos: 0,
          taxaOcupacao: 0,
          npsMedio: 0,
        },
        charts: {
          faturamentoAnual: Array.from(byMonth.entries()).map(([month, revenue]) => ({ month, revenue })),
          topServices: top.map(t => ({ name: t.name, count: t.count, revenue: 0 })),
        },
        alertas: [],
      }
    }
  })
}

export interface BillingData {
  totalRevenue: number
  revenueTrend: number
  totalPayout: number
  receitaLiquida: number
  totalAppointments: number
  completedAppts: number
  ticketMedio: number
  totalDelinquency: number
  revenueByChannel: { name: string; value: number }[]
  payouts: { id: string; name: string; specialty: string; appointments: number; gross: number; pct: string; net: number }[]
  delinquency: { patient: string; service: string; value: number; date: string; days: number }[]
  monthlyRevenue: { month: string; revenue: number }[]
}

export function useBillingData(clinicId?: string, _startDate?: string, _endDate?: string, period?: string) {
  return useQuery({
    queryKey: ['billingData', clinicId, period],
    queryFn: async (): Promise<BillingData> => {
      const params = new URLSearchParams()
      if (clinicId) params.set('clinicId', clinicId)
      if (period) params.set('period', period)
      const { data } = await api.get<BillingData>(`/metrics/billing?${params.toString()}`).catch(() => ({
        data: { totalRevenue: 0, revenueTrend: 0, totalPayout: 0, receitaLiquida: 0, totalAppointments: 0, completedAppts: 0, ticketMedio: 0, totalDelinquency: 0, revenueByChannel: [], payouts: [], delinquency: [], monthlyRevenue: [] } as BillingData
      }))
      return data
    }
  })
}

export interface ProfessionalMetric {
  id: string
  name: string
  specialty: string
  appointments: number
  completedCount: number
  cancelledCount: number
  cancelledByPatientCount?: number
  cancelledByReceptionCount?: number
  noShowCount: number
  cancellationRate: number
  conversionRate: number
  revenue: number
  netPayout: number
  commissionPct: number
  rating: number
  reviewCount: number
  occupancy: number
  revenuePerHour: number
  newPatients: number
  returningPatients: number
  revenueTrend: number
  appointmentsTrend: number
  status: 'destaque' | 'estavel' | 'atencao' | 'critico'
}

export function useProfessionalMetrics(clinicId?: string, _startDate?: string, _endDate?: string, period?: string) {
  return useQuery({
    queryKey: ['professionalMetrics', clinicId, period],
    queryFn: async (): Promise<ProfessionalMetric[]> => {
      const params = new URLSearchParams()
      if (clinicId) params.set('clinicId', clinicId)
      if (period) params.set('period', period)
      const { data } = await api.get<ProfessionalMetric[]>(`/metrics/professionals?${params.toString()}`).catch(() => ({ data: [] as ProfessionalMetric[] }))
      return data || []
    }
  })
}

export interface ServiceMetric {
  id: string
  name: string
  category: string
  duration: number
  price: number
  totalAppointments: number
  completedCount: number
  cancelledCount: number
  cancelledByPatientCount?: number
  cancelledByReceptionCount?: number
  noShowCount: number
  cancellationRate: number
  revenue: number
  avgPrice: number
  uniquePatients: number
  returningPatients: number
  returnRate: number
  avgRealDuration: number
  insurancePct: number
  revenuePerHour: number
  proCount: number
  topProfessional: string
  revenueTrend: number
  countTrend: number
  status: 'em_alta' | 'estavel' | 'atencao' | 'declinio'
}

export interface ServiceMetricsResponse {
  services: ServiceMetric[]
  peakHours: { hour: string; count: number }[]
}

export function useServiceMetrics(clinicId?: string, _startDate?: string, _endDate?: string, period?: string) {
  return useQuery({
    queryKey: ['serviceMetrics', clinicId, period],
    queryFn: async (): Promise<ServiceMetricsResponse> => {
      const params = new URLSearchParams()
      if (clinicId) params.set('clinicId', clinicId)
      if (period) params.set('period', period)
      const { data } = await api.get<ServiceMetricsResponse>(`/metrics/services?${params.toString()}`).catch(() => ({ data: { services: [], peakHours: [] } as ServiceMetricsResponse }))
      return data || { services: [], peakHours: [] }
    }
  })
}

export interface MarketingData {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  revenue: number
  appointmentsTrend: number
  newPatients: number
  funnel: {
    agendados: number
    confirmados: number
    concluidos: number
    cancelados: number
    confirmadosPct: number
    concluidosPct: number
    canceladosPct: number
  }
  byService: { name: string; value: number; pct: number; revenue: number }[]
  byDayOfWeek: { day: string; count: number }[]
  topServicesByRevenue: { name: string; value: number; pct: number; revenue: number }[]
}

export function useMarketingMetrics(clinicId?: string, _startDate?: string, _endDate?: string, period?: string) {
  return useQuery({
    queryKey: ['marketingMetrics', clinicId, period],
    queryFn: async (): Promise<MarketingData> => {
      const params = new URLSearchParams()
      if (clinicId) params.set('clinicId', clinicId)
      if (period) params.set('period', period)
      const { data } = await api.get<MarketingData>(`/metrics/marketing?${params.toString()}`).catch(() => ({
        data: { totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, revenue: 0, appointmentsTrend: 0, newPatients: 0, funnel: { agendados: 0, confirmados: 0, concluidos: 0, cancelados: 0, confirmadosPct: 0, concluidosPct: 0, canceladosPct: 0 }, byService: [], byDayOfWeek: [], topServicesByRevenue: [] } as MarketingData
      }))
      return data
    }
  })
}

export interface MovementEvent {
  time: string
  type: string
  description: string
  professional: string
  icon: string
}

export interface MovementProfessional {
  id: string
  name: string
  specialty: string
  total: number
  completed: number
  cancelled: number
  scheduled: number
  confirmed: number
  revenue: number
  showRate: number
}

export interface MovementData {
  totalAppointments: number
  scheduled: number
  confirmed: number
  inProgress: number
  completed: number
  cancelled: number
  showRate: number
  revenueToday: number
  pendingToday: number
  newPatients: number
  messagesCount: number
  apptsTrend: number
  revenueTrend: number
  completedTrend: number
  statusBreakdown: { status: string; label: string; count: number; pct: number }[]
  revenueByMethod: { name: string; value: number }[]
  hourlyDistribution: { hour: string; total: number; completed: number; cancelled: number }[]
  byProfessional: MovementProfessional[]
  events: MovementEvent[]
  upcoming: { time: string; endTime: string; patient: string; service: string; professional: string; status: string; duration: number }[]
}

export function useMovementData(clinicId?: string, date?: string) {
  return useQuery({
    queryKey: ['movementData', clinicId, date],
    queryFn: async (): Promise<MovementData> => {
      const params = new URLSearchParams()
      if (clinicId) params.set('clinicId', clinicId)
      if (date) params.set('date', date)
      const { data } = await api.get<MovementData>(`/metrics/movement?${params.toString()}`).catch(() => ({
        data: {
          totalAppointments: 0, scheduled: 0, confirmed: 0, inProgress: 0, completed: 0, cancelled: 0,
          showRate: 0, revenueToday: 0, pendingToday: 0, newPatients: 0, messagesCount: 0,
          apptsTrend: 0, revenueTrend: 0, completedTrend: 0,
          statusBreakdown: [], revenueByMethod: [], hourlyDistribution: [], byProfessional: [],
          events: [], upcoming: []
        } as MovementData
      }))
      return data
    }
  })
}
