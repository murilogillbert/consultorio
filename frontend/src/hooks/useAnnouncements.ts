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

export function useAnnouncements(clinicId?: string) {
  return useQuery({
    queryKey: ['announcements', clinicId],
    queryFn: async () => {
      const url = clinicId ? `/announcements?clinicId=${clinicId}` : '/announcements'
      const { data } = await api.get<Announcement[]>(url)
      return data
    },
  })
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateAnnouncementData) => {
      const res = await api.post('/announcements', data)
      return res.data as Announcement
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateAnnouncementData> & { id: string }) => {
      const res = await api.put(`/announcements/${id}`, data)
      return res.data as Announcement
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/announcements/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/announcements/${id}/read`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })
}

export function useResendAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/announcements/${id}/resend`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })
}
