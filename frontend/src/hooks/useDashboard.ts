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
  revenueByChannel: { name: string; value: number }[]
  payouts: { id: string; name: string; appointments: number; gross: number; pct: string; net: number }[]
  delinquency: { patient: string; service: string; value: number; date: string; days: number }[]
}

// Backend does not expose billing breakdown — return empty structure
export function useBillingData(_clinicId?: string, _startDate?: string, _endDate?: string, _period?: string) {
  return useQuery({
    queryKey: ['billingData'],
    queryFn: async (): Promise<BillingData> => ({
      revenueByChannel: [],
      payouts: [],
      delinquency: [],
    })
  })
}

export function useProfessionalMetrics(_clinicId?: string, _startDate?: string, _endDate?: string) {
  return useQuery({
    queryKey: ['professionalMetrics'],
    queryFn: async () => {
      const { data } = await api.get<any[]>('/dashboard/top-professionals').catch(() => ({ data: [] }))
      return data
    }
  })
}

export function useServiceMetrics(_clinicId?: string, _startDate?: string, _endDate?: string) {
  return useQuery({
    queryKey: ['serviceMetrics'],
    queryFn: async (): Promise<{ services: any[]; peakHours: any[] }> => {
      const { data } = await api.get<any[]>('/dashboard/top-services').catch(() => ({ data: [] }))
      return { services: data, peakHours: [] }
    }
  })
}

export function useMarketingMetrics(_clinicId?: string, _startDate?: string, _endDate?: string) {
  return useQuery({
    queryKey: ['marketingMetrics'],
    queryFn: async (): Promise<{ origins: any[]; campaigns: any[] }> => ({ origins: [], campaigns: [] })
  })
}

export function useMovementData(_clinicId?: string, _date?: string) {
  return useQuery({
    queryKey: ['movementData'],
    queryFn: async (): Promise<any[]> => []
  })
}
