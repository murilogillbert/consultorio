import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface Clinic {
  id: string
  name: string
  cnpj?: string
  address?: string
  phone?: string
  email?: string
  description?: string
  logoUrl?: string
  instagram?: string
  facebook?: string
  youtube?: string
  linkedin?: string
  tiktok?: string
  whatsapp?: string
  createdAt: string
  updatedAt: string
}

export function useClinics() {
  return useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const { data } = await api.get<Clinic[]>('/clinics')
      return data
    }
  })
}

export function useMyClinic() {
  return useQuery({
    queryKey: ['clinics', 'me'],
    queryFn: async () => {
      const { data } = await api.get<Clinic>('/clinics/me')
      return data
    }
  })
}

export function useClinic(id: string | undefined) {
  return useQuery({
    queryKey: ['clinics', id],
    queryFn: async () => {
      const { data } = await api.get<Clinic>(`/clinics/${id}`)
      return data
    },
    enabled: !!id
  })
}

export function useUpdateClinic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; [key: string]: any }) => {
      const { data } = await api.put(`/clinics/${id}`, updateData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinics'] })
    }
  })
}
