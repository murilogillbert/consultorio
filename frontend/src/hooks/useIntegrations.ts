import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  return useQuery<IntegrationSettings | null>({
    queryKey: ['integrations', clinicId],
    queryFn: async () => {
      try {
        const { data } = await api.get<IntegrationSettings>(`/clinics/${clinicId}/settings/integrations`)
        return data
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null
        }

        throw error
      }
    },
    enabled: !!clinicId,
    staleTime: Infinity,
  })
}

export function useUpdateIntegrations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clinicId, data }: { clinicId: string; data: Partial<IntegrationSettings> }) => {
      const { data: result } = await api.put(`/clinics/${clinicId}/settings/integrations`, data)
      return result
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.clinicId] })
    },
  })
}

export function useTestIntegration() {
  return useMutation({
    mutationFn: async ({ clinicId, type }: { clinicId: string; type: string }) => {
      const { data } = await api.post<{ ok: boolean; message: string; detail?: string }>(
        `/clinics/${clinicId}/settings/integrations/${type}/test`,
        {}
      )
      return data
    },
  })
}
