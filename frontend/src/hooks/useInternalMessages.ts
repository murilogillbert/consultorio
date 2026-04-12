import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface InternalMessage {
  id: string
  channelId: string
  content: string
  isEdited: boolean
  createdAt: string
  sender?: { id: string; name: string; avatarUrl?: string }
}

export function useChannelMessages(channelId: string | null) {
  return useQuery<InternalMessage[]>({
    queryKey: ['channel-messages', channelId],
    queryFn: async () => {
      const { data } = await api.get<InternalMessage[]>(`/chatchannels/${channelId}/messages`)
      return data
    },
    enabled: !!channelId,
    refetchInterval: 10_000, // poll every 10 s
  })
}

export function useSendChannelMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ channelId, content }: { channelId: string; content: string; replyToId?: string }) => {
      const { data } = await api.post<InternalMessage>(`/chatchannels/${channelId}/messages`, { content })
      return data
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['channel-messages', vars.channelId] })
  })
}
