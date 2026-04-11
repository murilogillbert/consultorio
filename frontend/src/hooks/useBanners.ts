import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend BannerResponseDto: { id, title, description, imageUrl, link, order, isActive, createdAt }
interface BannerRaw {
  id: string
  title: string
  description?: string
  imageUrl?: string
  link?: string
  order: number
  isActive: boolean
  createdAt: string
}

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

function mapBanner(b: BannerRaw): SliderBanner {
  return {
    id: b.id,
    clinicId: '',
    title: b.title,
    subtitle: b.description,
    imageUrl: b.imageUrl,
    ctaUrl: b.link,
    order: b.order,
    active: b.isActive,
    createdAt: b.createdAt,
  }
}

export function useBanners(_clinicId?: string) {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data } = await api.get<BannerRaw[]>('/banners')
      return data.map(mapBanner)
    }
  })
}

export function useCreateBanner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (b: Partial<SliderBanner>) => {
      const payload = {
        title: b.title,
        description: b.subtitle,
        imageUrl: b.imageUrl,
        link: b.ctaUrl,
        order: b.order ?? 0,
      }
      const { data } = await api.post<BannerRaw>('/banners', payload)
      return mapBanner(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] })
  })
}

export function useUpdateBanner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...b }: Partial<SliderBanner> & { id: string }) => {
      const payload: any = {}
      if (b.title !== undefined) payload.title = b.title
      if (b.subtitle !== undefined) payload.description = b.subtitle
      if (b.imageUrl !== undefined) payload.imageUrl = b.imageUrl
      if (b.ctaUrl !== undefined) payload.link = b.ctaUrl
      if (b.order !== undefined) payload.order = b.order
      if (b.active !== undefined) payload.isActive = b.active
      const { data } = await api.put<BannerRaw>(`/banners/${id}`, payload)
      return mapBanner(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] })
  })
}

export function useDeleteBanner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/banners/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] })
  })
}
