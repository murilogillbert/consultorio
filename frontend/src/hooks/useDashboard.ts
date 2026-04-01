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

export function useDashboardMetrics(clinicId?: string) {
  return useQuery({
    queryKey: ['dashboardMetrics', clinicId],
    queryFn: async () => {
      const url = clinicId ? `/metrics/dashboard?clinicId=${clinicId}` : '/metrics/dashboard'
      const { data } = await api.get<DashboardMetrics>(url)
      return data
    }
  })
}
