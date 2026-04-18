import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface PatientConversationSummary {
  patientId: string
  patientName: string
  patientEmail?: string
  lastMessageAt: string
  unreadCount: number
  lastMessage?: string
  source?: string
}

export interface PatientMessageItem {
  id: string
  direction: 'IN' | 'OUT'
  content: string
  isRead: boolean
  source?: string
  createdAt: string
  sentByUserId?: string
}

export interface PatientConversationDetail {
  patient: {
    id: string
    name: string
    email?: string
    phone?: string
  } | null
  messages: PatientMessageItem[]
}

export interface ExternalMessage {
  id: string
  conversationId: string
  direction: 'IN' | 'OUT'
  type: string
  content?: string
  createdAt: string
  readAt?: string
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

function mapConversationSummary(conversation: Conversation): PatientConversationSummary {
  const lastMessage = conversation.messages?.[0]

  return {
    patientId: conversation.id,
    patientName: conversation.contact?.name || conversation.contact?.phone || 'Contato sem nome',
    patientEmail: conversation.contact?.email,
    lastMessageAt: conversation.lastMessageAt || lastMessage?.createdAt || conversation.createdAt,
    unreadCount: conversation.unreadCount,
    lastMessage: lastMessage?.content,
    source: conversation.channel,
  }
}

function mapConversationMessage(message: ExternalMessage): PatientMessageItem {
  return {
    id: message.id,
    direction: message.direction,
    content: message.content || '',
    isRead: !!message.readAt,
    createdAt: message.createdAt,
    sentByUserId: message.sentById,
  }
}

export function useConversations(clinicId?: string) {
  return useQuery<PatientConversationSummary[]>({
    queryKey: ['patient-conversations', clinicId],
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>('/messaging/conversations', {
        params: clinicId ? { clinicId } : undefined,
      })
      return data.map(mapConversationSummary)
    },
    enabled: !!clinicId,
    refetchInterval: 15_000,
  })
}

export function usePatientConversationDetail(conversationId: string | null) {
  return useQuery<PatientConversationDetail>({
    queryKey: ['patient-conversation-messages', conversationId],
    queryFn: async () => {
      const { data } = await api.get<ExternalMessage[]>(`/messaging/conversations/${conversationId}/messages`)
      return {
        patient: null,
        messages: data.map(mapConversationMessage),
      }
    },
    enabled: !!conversationId,
    refetchInterval: 10_000,
  })
}

export function useSendConversationMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { data } = await api.post<ExternalMessage>(`/messaging/conversations/${conversationId}/messages`, { content })
      return mapConversationMessage(data)
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['patient-conversation-messages', vars.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['patient-conversations'] })
    }
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conversationId: string) => {
      await api.patch(`/messaging/conversations/${conversationId}/read`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-conversations'] })
  })
}

export function useConversationMessages(conversationId: string | null) {
  return usePatientConversationDetail(conversationId)
}
