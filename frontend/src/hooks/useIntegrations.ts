import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface IntegrationSettings {
  id?: string
  clinicId: string
  gmailClientId?: string
  gmailClientSecret?: string
  gmailAccessToken?: string
  gmailRefreshToken?: string
  pubsubProjectId?: string
  pubsubTopicName?: string
  pubsubServiceAccount?: string
  waPhoneNumberId?: string
  waWabaId?: string
  waAccessToken?: string
  waVerifyToken?: string
  waAppSecret?: string
  igAccountId?: string
  igPageId?: string
  igAccessToken?: string
  mpAccessTokenProd?: string
  mpAccessTokenSandbox?: string
  mpPublicKeyProd?: string
  mpWebhookSecret?: string
  mpConnected?: boolean
  gmailConnected?: boolean
  waConnected?: boolean
  igConnected?: boolean
}

export function useIntegrations(clinicId?: string) {
  return useQuery({
    queryKey: ['integrations', clinicId],
    queryFn: async () => {
      if (!clinicId) return null
      const { data } = await api.get<IntegrationSettings>(`/clinics/${clinicId}/settings/integrations`)
      return data
    },
    enabled: !!clinicId,
  })
}

export function useUpdateIntegrations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clinicId, data }: { clinicId: string, data: Partial<IntegrationSettings> }) => {
      const { data: result } = await api.put(`/clinics/${clinicId}/settings/integrations`, data)
      return result
    },
    onSuccess: (_, { clinicId }) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', clinicId] })
    }
  })
}

export function useTestIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clinicId, type }: { clinicId: string; type: string }) => {
      const { data } = await api.post<{ ok: boolean; message: string; detail?: string }>(
        `/clinics/${clinicId}/settings/integrations/${type}/test`
      )
      return data
    },
    onSuccess: (_, { clinicId }) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', clinicId] })
    }
  })
}
