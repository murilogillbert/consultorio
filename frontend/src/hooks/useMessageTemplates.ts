import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export type TemplateKind = 'CONFIRMATION' | 'REMINDER' | 'POST_APPOINTMENT' | 'BIRTHDAY'

export interface MessageTemplate {
  kind: TemplateKind
  body: string
  isDefault: boolean
  variables: string[]
  updatedAt?: string | null
}

export const TEMPLATE_LABELS: Record<TemplateKind, string> = {
  CONFIRMATION: 'Confirmação',
  REMINDER: 'Lembrete',
  POST_APPOINTMENT: 'Pós-Atendimento',
  BIRTHDAY: 'Aniversário',
}

export function useMessageTemplates() {
  return useQuery<MessageTemplate[]>({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data } = await api.get<MessageTemplate[]>('/message-templates')
      return data
    },
  })
}

export function useUpsertMessageTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ kind, body }: { kind: TemplateKind; body: string }) => {
      const { data } = await api.put<MessageTemplate>(`/message-templates/${kind}`, { body })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] })
    },
  })
}

export interface TemplatePreview {
  kind: string
  body: string
  rendered: string
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: async ({ patientId, kind, appointmentId }: {
      patientId: string
      kind: TemplateKind
      appointmentId?: string
    }) => {
      const { data } = await api.post<TemplatePreview>(
        `/patient-conversations/${patientId}/preview-template`,
        { kind, appointmentId }
      )
      return data
    },
  })
}

export function useSendTemplateMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ patientId, kind, appointmentId }: {
      patientId: string
      kind: TemplateKind
      appointmentId?: string
    }) => {
      const { data } = await api.post(
        `/patient-conversations/${patientId}/send-template`,
        { kind, appointmentId }
      )
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['patient-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['patient-conversation-messages', vars.patientId] })
    },
  })
}
