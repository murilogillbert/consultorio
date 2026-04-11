import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// NOTE: backend does not expose external messaging/conversations yet. Stubbed.

export interface ExternalMessage {
  id: string
  conversationId: string
  direction: 'IN' | 'OUT'
  type: string
  content?: string
  createdAt: string
  sentById?: string
}

export interface Conversation {
  id: string
  clinicId: string
  contactId: string
  channel: string
  status: string
  unreadCount: number
  lastMessageAt?: string
  createdAt: string
  contact?: {
    id: string
    name?: string
    phone?: string
    email?: string
    patientId?: string
  }
  messages?: ExternalMessage[]
}

export function useConversations(_clinicId?: string) {
  return useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => [],
    staleTime: Infinity,
  })
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery<ExternalMessage[]>({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => [],
    enabled: !!conversationId,
    staleTime: Infinity,
  })
}

export function useSendConversationMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: { conversationId: string; content: string }) => ({} as ExternalMessage),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', vars.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: string) => { /* no-op */ },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] })
  })
}
