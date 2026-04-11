import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export type AnnouncementUrgency = 'NORMAL' | 'IMPORTANT' | 'URGENT'
export type AnnouncementAudience = 'ALL' | 'STAFF' | 'PROFESSIONALS' | 'SPECIFIC'

export interface AnnouncementRead {
  userId: string
  readAt: string
}

export interface Announcement {
  id: string
  clinicId: string
  publishedById: string
  title: string
  content: string
  fileUrl?: string
  urgency: AnnouncementUrgency
  audience: AnnouncementAudience
  audienceIds?: string
  active: boolean
  expiresAt?: string
  createdAt: string
  updatedAt: string
  publishedBy?: { id: string; name: string; avatarUrl?: string }
  reads?: AnnouncementRead[]
  _count?: { reads: number }
}

export interface CreateAnnouncementData {
  clinicId?: string
  title: string
  content: string
  fileUrl?: string
  urgency?: AnnouncementUrgency
  audience?: AnnouncementAudience
  audienceIds?: string
  expiresAt?: string
}

export function useAnnouncements(_clinicId?: string) {
  return useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await api.get<Announcement[]>('/announcements')
      return data
    },
  })
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAnnouncementData) => {
      const { data } = await api.post<Announcement>('/announcements', input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateAnnouncementData> & { id: string }) => {
      const { data } = await api.put<Announcement>(`/announcements/${id}`, input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/announcements/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/announcements/${id}/read`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useResendAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/announcements/${id}/resend`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })
}
