import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface Professional {
  id: string
  userId: string
  crm: string
  councilType: string
  specialty: string
  bio?: string
  languages?: string
  active: boolean
  user?: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }
  services?: Array<{ service: { id: string; name: string } }>
  schedules?: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>
  educations?: Array<{ id: string; institution: string; degree: string; fieldOfStudy: string; year: number }>
  certifications?: Array<{ id: string; name: string; institution: string; year: number }>
}

export function useProfessionals() {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data } = await api.get<Professional[]>('/professionals')
      return data
    }
  })
}

export function useProfessional(id: string | undefined) {
  return useQuery({
    queryKey: ['professionals', id],
    queryFn: async () => {
      const { data } = await api.get<Professional>(`/professionals/${id}`)
      return data
    },
    enabled: !!id
  })
}

export function useCreateProfessional() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (professionalData: {
      userId: string
      crm: string
      councilType: string
      specialty: string
      bio?: string
      languages?: string
      schedules?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
    }) => {
      const { data } = await api.post('/professionals', professionalData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
    }
  })
}

export function useUpdateProfessional() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; [key: string]: any }) => {
      const { data } = await api.put(`/professionals/${id}`, updateData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
    }
  })
}
