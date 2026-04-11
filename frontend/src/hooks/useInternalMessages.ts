import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// NOTE: backend does not expose messaging/channels yet. Stubbed no-ops.

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
  return useQuery<InternalMessage[]>({
    queryKey: ['channel-messages', channelId],
    queryFn: async () => [],
    enabled: !!channelId,
    staleTime: Infinity,
  })
}

export function useSendChannelMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: { channelId: string; content: string; replyToId?: string }) => ({} as InternalMessage),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['channel-messages', vars.channelId] })
  })
}
