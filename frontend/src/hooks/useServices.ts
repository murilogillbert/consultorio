import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface Service {
  id: string
  name: string
  description?: string
  shortDescription?: string
  category?: string
  duration: number
  price: number
  preparation?: string
  onlineBooking: boolean
  active: boolean
  imageUrl?: string
  createdAt: string
  updatedAt: string
  professionals?: Array<{ professional: { id: string; user?: { name: string } } }>
  insurances?: Array<{ insurancePlan: { id: string; name: string } }>
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get<Service[]>('/services')
      return data
    }
  })
}

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: ['services', id],
    queryFn: async () => {
      const { data } = await api.get<Service>(`/services/${id}`)
      return data
    },
    enabled: !!id
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (serviceData: {
      name: string
      description?: string
      shortDescription?: string
      category?: string
      duration: number
      price: number
      preparation?: string
      onlineBooking?: boolean
      imageUrl?: string
    }) => {
      const { data } = await api.post('/services', serviceData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
    }
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; [key: string]: any }) => {
      const { data } = await api.put(`/services/${id}`, updateData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
    }
  })
}

export function useArchiveService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/services/${id}/archive`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
    }
  })
}
