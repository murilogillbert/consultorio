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

// Raw shape returned by GET /api/patient-conversations
interface ConversationSummaryRaw {
  patientId: string
  patientName: string
  patientEmail?: string
  lastMessageAt?: string
  unreadCount: number
  lastMessage?: string
  source?: string
}

// Raw shape returned by GET /api/patient-conversations/{id}/messages
interface ConversationDetailRaw {
  patient: {
    id: string
    name: string
    email?: string
    phone?: string
  } | null
  messages: PatientMessageItem[]
}

export function useConversations(clinicId?: string) {
  return useQuery<PatientConversationSummary[]>({
    queryKey: ['patient-conversations', clinicId],
    queryFn: async () => {
      // clinicId is read from the JWT on the backend — no query param needed.
      const { data } = await api.get<ConversationSummaryRaw[]>('/patient-conversations')
      return data.map(c => ({
        patientId: c.patientId,
        patientName: c.patientName,
        patientEmail: c.patientEmail,
        lastMessageAt: c.lastMessageAt || new Date().toISOString(),
        unreadCount: c.unreadCount,
        lastMessage: c.lastMessage,
        source: c.source,
      }))
    },
    enabled: !!clinicId,
    refetchInterval: 15_000,
  })
}

export function usePatientConversationDetail(patientId: string | null) {
  return useQuery<PatientConversationDetail>({
    queryKey: ['patient-conversation-messages', patientId],
    queryFn: async () => {
      const { data } = await api.get<ConversationDetailRaw>(`/patient-conversations/${patientId}/messages`)
      return {
        patient: data.patient ?? null,
        messages: data.messages ?? [],
      }
    },
    enabled: !!patientId,
    refetchInterval: 10_000,
  })
}

export function useSendConversationMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { data } = await api.post<PatientMessageItem>(`/patient-conversations/${conversationId}/reply`, { content })
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['patient-conversation-messages', vars.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['patient-conversations'] })
    }
  })
}

// Backend auto-marks messages as read on GET — no dedicated endpoint needed
export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_conversationId: string) => {
      // No-op: the backend marks messages read automatically when fetched
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-conversations'] })
  })
}

export function useConversationMessages(conversationId: string | null) {
  return usePatientConversationDetail(conversationId)
}
