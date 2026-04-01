import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface InsurancePlan {
  id: string
  clinicId: string
  name: string
  documentsRequired?: string
  active: boolean
}

export function useInsurances(clinicId?: string) {
  return useQuery({
    queryKey: ['insurances', clinicId],
    queryFn: async () => {
      const url = clinicId ? `/insurances?clinicId=${clinicId}` : '/insurances'
      const { data } = await api.get<InsurancePlan[]>(url)
      return data
    }
  })
}

export function useCreateInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<InsurancePlan>) => {
      const response = await api.post('/insurances', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurances'] })
    }
  })
}

export function useUpdateInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<InsurancePlan> & { id: string }) => {
      const { id, ...rest } = data
      const response = await api.put(`/insurances/${id}`, rest)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurances'] })
    }
  })
}

export function useDeleteInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/insurances/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurances'] })
    }
  })
}
