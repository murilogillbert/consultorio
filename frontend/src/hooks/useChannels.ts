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

interface ChannelRaw {
  id: string
  clinicId: string
  name: string
  description?: string
  type: string
  adminOnly: boolean
  active: boolean
  memberCount: number
  createdAt: string
}

function mapChannel(raw: ChannelRaw): Channel {
  return {
    id: raw.id,
    clinicId: raw.clinicId,
    name: raw.name,
    description: raw.description,
    type: raw.type,
    adminOnly: raw.adminOnly,
    active: raw.active,
    _count: { members: raw.memberCount },
  }
}

export function useChannels(_clinicId?: string) {
  return useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data } = await api.get<ChannelRaw[]>('/chatchannels')
      return data.map(mapChannel)
    },
  })
}

export function useCreateChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Channel> & { clinicId?: string }) => {
      const payload = {
        clinicId: input.clinicId,
        name: input.name,
        description: input.description,
        type: input.type || 'CHANNEL',
        adminOnly: input.adminOnly || false,
        active: input.active ?? true,
      }
      const { data } = await api.post<ChannelRaw>('/chatchannels', payload)
      return mapChannel(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  })
}

export function useUpdateChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Channel> & { id: string }) => {
      const payload: any = {}
      if (input.name !== undefined) payload.name = input.name
      if (input.description !== undefined) payload.description = input.description
      if (input.type !== undefined) payload.type = input.type
      if (input.adminOnly !== undefined) payload.adminOnly = input.adminOnly
      if (input.active !== undefined) payload.active = input.active
      const { data } = await api.put<ChannelRaw>(`/chatchannels/${id}`, payload)
      return mapChannel(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  })
}

export function useDeleteChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/chatchannels/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  })
}
