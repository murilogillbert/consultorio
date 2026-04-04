import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface SliderBanner {
  id: string
  clinicId: string
  title: string
  subtitle?: string
  imageUrl?: string
  videoUrl?: string
  ctaLabel?: string
  ctaUrl?: string
  order: number
  active: boolean
  expiresAt?: string
  createdAt: string
}

export function useBanners(clinicId?: string) {
  return useQuery({
    queryKey: ['banners', clinicId],
    queryFn: async () => {
      const url = clinicId ? `/banners/public/${clinicId}` : '/banners'
      const { data } = await api.get<SliderBanner[]>(url)
      return data
    },
    enabled: true // Banners can be fetched without clinicId if admin
  })
}

export function useCreateBanner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bannerData: Partial<SliderBanner>) => {
      const { data } = await api.post('/banners', bannerData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
    }
  })
}

export function useUpdateBanner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SliderBanner> & { id: string }) => {
      const response = await api.put(`/banners/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
    }
  })
}

export function useDeleteBanner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/banners/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
    }
  })
}
