import { useQuery, useMutation } from '@tanstack/react-query'

// NOTE: backend does not expose clinic integration settings yet. Stubbed.

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
    queryFn: async () => null,
    enabled: !!clinicId,
    staleTime: Infinity,
  })
}

export function useUpdateIntegrations() {
  return useMutation({
    mutationFn: async (_: { clinicId: string, data: Partial<IntegrationSettings> }) => ({ })
  })
}

export function useTestIntegration() {
  return useMutation({
    mutationFn: async (_: { clinicId: string; type: string }) => ({
      ok: false,
      message: 'Integração ainda não implementada no backend.',
    })
  })
}
