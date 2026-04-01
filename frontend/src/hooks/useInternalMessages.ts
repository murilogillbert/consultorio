import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface InternalMessage {
  id: string
  channelId: string
  senderId: string
  content: string
  type: string
  createdAt: string
  editedAt?: string
  deletedAt?: string
  sender?: { id: string; name: string; avatarUrl?: string }
  _count?: { pinnedBy: number }
}

export function useChannelMessages(channelId: string | null) {
  return useQuery({
    queryKey: ['channel-messages', channelId],
    queryFn: async () => {
      const { data } = await api.get<InternalMessage[]>(`/messaging/channels/${channelId}/messages`)
      return data
    },
    enabled: !!channelId,
    refetchInterval: 5000, // poll every 5s for new messages
  })
}

export function useSendChannelMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ channelId, content, replyToId }: { channelId: string; content: string; replyToId?: string }) => {
      const { data } = await api.post(`/messaging/channels/${channelId}/messages`, { content, replyToId })
      return data as InternalMessage
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['channel-messages', vars.channelId] })
    },
  })
}
