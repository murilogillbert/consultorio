import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// NOTE: backend does not expose a messaging/channels controller yet. This hook
// returns an empty list and no-op mutations so the admin UI renders.

export interface Channel {
  id: string
  clinicId: string
  name: string
  description?: string
  type: string
  adminOnly: boolean
  active: boolean
  _count?: {
    members: number
  }
}

export function useChannels(_clinicId?: string) {
  return useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => [],
    staleTime: Infinity,
  })
}

export function useCreateChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: Partial<Channel>) => ({ }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] })
  })
}

export function useUpdateChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: Partial<Channel> & { id: string }) => ({ }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] })
  })
}

export function useDeleteChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: string) => { /* no-op */ },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] })
  })
}
