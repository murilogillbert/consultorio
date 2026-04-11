import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend: /api/insuranceplans returning InsurancePlanResponseDto
// { id, name, description, isActive, createdAt }
interface InsurancePlanRaw {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
}

export interface InsurancePlan {
  id: string
  clinicId: string
  name: string
  documentsRequired?: string
  active: boolean
}

function mapPlan(raw: InsurancePlanRaw): InsurancePlan {
  return {
    id: raw.id,
    clinicId: '',
    name: raw.name,
    documentsRequired: raw.description,
    active: raw.isActive,
  }
}

export function useInsurances(_clinicId?: string) {
  return useQuery({
    queryKey: ['insurances'],
    queryFn: async () => {
      const { data } = await api.get<InsurancePlanRaw[]>('/insuranceplans')
      return data.map(mapPlan)
    }
  })
}

export function useCreateInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<InsurancePlan>) => {
      const payload = { name: data.name, description: data.documentsRequired }
      const response = await api.post<InsurancePlanRaw>('/insuranceplans', payload)
      return mapPlan(response.data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurances'] })
  })
}

export function useUpdateInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<InsurancePlan> & { id: string }) => {
      const payload: any = {}
      if (data.name !== undefined) payload.name = data.name
      if (data.documentsRequired !== undefined) payload.description = data.documentsRequired
      if (data.active !== undefined) payload.isActive = data.active
      const response = await api.put<InsurancePlanRaw>(`/insuranceplans/${data.id}`, payload)
      return mapPlan(response.data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurances'] })
  })
}

export function useDeleteInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/insuranceplans/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurances'] })
  })
}
