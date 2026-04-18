import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

// Aliases used by MensagensPage (external = patient conversations)
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

/** Lists all patients who have sent at least one message. */
export function useConversations(_clinicId?: string) {
  return useQuery<PatientConversationSummary[]>({
    queryKey: ['patient-conversations'],
    queryFn: async () => {
      const { data } = await api.get<PatientConversationSummary[]>('/patient-conversations')
      return data
    },
    refetchInterval: 15_000, // poll every 15 s
  })
}

/** Fetches all messages for a given patient (by patientId). */
export function usePatientConversationDetail(patientId: string | null) {
  return useQuery<PatientConversationDetail>({
    queryKey: ['patient-conversation-messages', patientId],
    queryFn: async () => {
      const { data } = await api.get<PatientConversationDetail>(`/patient-conversations/${patientId}/messages`)
      return data
    },
    enabled: !!patientId,
    refetchInterval: 10_000,
  })
}

/** Staff replies to a patient message. */
export function useSendConversationMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { data } = await api.post(`/patient-conversations/${conversationId}/reply`, { content })
      return data as PatientMessageItem
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
    mutationFn: async (_patientId: string) => { /* reads are marked server-side on GET messages */ },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-conversations'] })
  })
}

// Legacy alias kept for compatibility
export function useConversationMessages(conversationId: string | null) {
  return usePatientConversationDetail(conversationId)
}
