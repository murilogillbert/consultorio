import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export type CustoTipo = 'Fixo' | 'Variavel' | 'Variável'
export type CustoRecorrencia = 'Unico' | 'Único' | 'Mensal' | 'Anual'
export type CustoStatus = 'Pago' | 'Pendente' | 'Previsto'

export interface Custo {
  id: string
  nome: string
  categoria: string
  valor: number
  tipo: string
  recorrencia: string
  dataCompetencia: string
  dataVencimento?: string | null
  status: string
  observacoes?: string | null
  criadoEm: string
  atualizadoEm?: string | null
}

export interface CreateCustoInput {
  nome: string
  categoria: string
  valor: number
  tipo?: string
  recorrencia?: string
  dataCompetencia: string
  dataVencimento?: string | null
  status?: string
  observacoes?: string | null
}

export interface UpdateCustoInput extends Partial<CreateCustoInput> {}

export interface CustoFilters {
  period?: string
  start?: string
  end?: string
  categoria?: string
  status?: string
}

function buildQuery(filters?: CustoFilters) {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (filters.period) params.set('period', filters.period)
  if (filters.start) params.set('start', filters.start)
  if (filters.end) params.set('end', filters.end)
  if (filters.categoria) params.set('categoria', filters.categoria)
  if (filters.status) params.set('status', filters.status)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useCustos(filters?: CustoFilters) {
  return useQuery<Custo[]>({
    queryKey: ['custos', filters],
    queryFn: async () => {
      const { data } = await api.get<Custo[]>(`/custos${buildQuery(filters)}`)
      return data || []
    },
  })
}

export function useCreateCusto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCustoInput) => {
      const { data } = await api.post<Custo>('/custos', input)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custos'] })
      qc.invalidateQueries({ queryKey: ['billingData'] })
    },
  })
}

export function useUpdateCusto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCustoInput & { id: string }) => {
      const { data } = await api.put<Custo>(`/custos/${id}`, input)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custos'] })
      qc.invalidateQueries({ queryKey: ['billingData'] })
    },
  })
}

export function useDeleteCusto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/custos/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custos'] })
      qc.invalidateQueries({ queryKey: ['billingData'] })
    },
  })
}
