import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// NOTE: backend does not expose an announcements controller yet. Stubbed.

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
    queryFn: async () => [],
    staleTime: Infinity,
  })
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: CreateAnnouncementData) => ({ } as Announcement),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] })
  })
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: Partial<CreateAnnouncementData> & { id: string }) => ({ } as Announcement),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] })
  })
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: string) => { /* no-op */ },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] })
  })
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: string) => ({ }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] })
  })
}

export function useResendAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: string) => ({ }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] })
  })
}
