import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

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

export function useDashboardMetrics(clinicId?: string, period?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['dashboardMetrics', clinicId, period, startDate, endDate],
    queryFn: async () => {
      let url = `/metrics/dashboard?`
      if (clinicId) url += `clinicId=${clinicId}&`
      if (startDate) url += `startDate=${startDate}&`
      if (endDate) url += `endDate=${endDate}&`
      if (period) url += `period=${encodeURIComponent(period)}&`
      const { data } = await api.get<DashboardMetrics>(url)
      return data
    }
  })
}

export interface BillingData {
  revenueByChannel: { name: string; value: number }[]
  payouts: { id: string; name: string; appointments: number; gross: number; pct: string; net: number }[]
  delinquency: { patient: string; service: string; value: number; date: string; days: number }[]
}

export function useBillingData(clinicId?: string, startDate?: string, endDate?: string, period?: string) {
  return useQuery({
    queryKey: ['billingData', clinicId, startDate, endDate, period],
    queryFn: async () => {
      let url = `/metrics/billing?`
      if (clinicId) url += `clinicId=${clinicId}&`
      if (startDate) url += `startDate=${startDate}&`
      if (endDate) url += `endDate=${endDate}&`
      if (period) url += `period=${encodeURIComponent(period)}&`
      const { data } = await api.get<BillingData>(url)
      return data
    }
  })
}

export function useProfessionalMetrics(clinicId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['professionalMetrics', clinicId, startDate, endDate],
    queryFn: async () => {
      let url = `/metrics/professionals?`
      if (clinicId) url += `clinicId=${clinicId}&`
      const { data } = await api.get<any[]>(url)
      return data
    }
  })
}

export function useServiceMetrics(clinicId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['serviceMetrics', clinicId, startDate, endDate],
    queryFn: async () => {
      let url = `/metrics/services?`
      if (clinicId) url += `clinicId=${clinicId}&`
      if (startDate) url += `startDate=${startDate}&`
      if (endDate) url += `endDate=${endDate}&`
      const { data } = await api.get<{ services: any[], peakHours: any[] }>(url)
      return data
    }
  })
}

export function useMarketingMetrics(clinicId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['marketingMetrics', clinicId, startDate, endDate],
    queryFn: async () => {
      let url = `/metrics/marketing?`
      if (clinicId) url += `clinicId=${clinicId}&`
      if (startDate) url += `startDate=${startDate}&`
      if (endDate) url += `endDate=${endDate}&`
      const { data } = await api.get<{ origins: any[], campaigns: any[] }>(url)
      return data
    }
  })
}

export function useMovementData(clinicId?: string, date?: string) {
  return useQuery({
    queryKey: ['movementData', clinicId, date],
    queryFn: async () => {
      let url = `/metrics/movement?`
      if (clinicId) url += `clinicId=${clinicId}&`
      if (date) url += `date=${date}&`
      const { data } = await api.get<any[]>(url)
      return data
    }
  })
}
