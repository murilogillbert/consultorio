import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

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

export function useConversations(clinicId?: string) {
  return useQuery({
    queryKey: ['conversations', clinicId],
    queryFn: async () => {
      const url = clinicId ? `/messaging/conversations?clinicId=${clinicId}` : '/messaging/conversations'
      const { data } = await api.get<Conversation[]>(url)
      return data
    },
    refetchInterval: 10000,
  })
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      const { data } = await api.get<ExternalMessage[]>(`/messaging/conversations/${conversationId}/messages`)
      return data
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  })
}

export function useSendConversationMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { data } = await api.post(`/messaging/conversations/${conversationId}/messages`, { content })
      return data as ExternalMessage
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', vars.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conversationId: string) => {
      await api.patch(`/messaging/conversations/${conversationId}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
