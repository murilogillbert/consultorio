import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

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

export function useChannels(clinicId?: string) {
  return useQuery({
    queryKey: ['channels', clinicId],
    queryFn: async () => {
      const url = clinicId ? `/messaging/channels?clinicId=${clinicId}` : '/messaging/channels'
      const { data } = await api.get<Channel[]>(url)
      return data
    }
  })
}

export function useCreateChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Channel>) => {
      const response = await api.post('/messaging/channels', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    }
  })
}

export function useUpdateChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Channel> & { id: string }) => {
      const { id, ...rest } = data
      const response = await api.put(`/messaging/channels/${id}`, rest)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    }
  })
}

export function useDeleteChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/messaging/channels/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    }
  })
}
