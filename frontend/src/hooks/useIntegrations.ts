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
      const response = await api.put<IntegrationSettings>(`/clinics/${clinicId}/settings/integrations`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.clinicId] })
    },
  })
}

export function useTestIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clinicId, type }: { clinicId: string; type: string }) => {
      const response = await api.post<{ ok: boolean; message: string; detail?: string }>(
        `/clinics/${clinicId}/settings/integrations/${type}/test`,
      )

      return {
        clinicId,
        ...response.data,
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', result.clinicId] })
    },
  })
}
