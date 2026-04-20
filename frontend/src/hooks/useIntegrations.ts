import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface IntegrationSettings {
  id?: string
  clinicId?: string

  // ── Node.js backend field names ──
  gmailClientId?: string
  gmailClientSecret?: string
  gmailAccessToken?: string
  gmailRefreshToken?: string
  gmailAddress?: string
  pubsubProjectId?: string
  pubsubTopicName?: string
  pubsubServiceAccount?: string
  pubsubSubscriptionName?: string
  pubsubWatchExpiresAt?: string
  pubsubConnected?: boolean
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
  mpConnected?: boolean
  gmailConnected?: boolean
  waConnected?: boolean
  igConnected?: boolean

  // ── .NET backend field names (masked tokens — read-only display) ──
  accessTokenProdMasked?: string
  accessTokenSandboxMasked?: string
  publicKey?: string           // MP public key (unmasked — safe to display)
  sandboxMode?: boolean        // true = sandbox, false = production
  connected?: boolean          // .NET equivalent of mpConnected
}

export function useIntegrations(clinicId?: string) {
  return useQuery<IntegrationSettings | null>({
    queryKey: ['integrations', clinicId],
    queryFn: async () => {
      try {
        const { data } = await api.get<IntegrationSettings>(`/clinics/${clinicId}/settings/integrations`)
        return data
      } catch (error: any) {
        // Return null gracefully for any client error (4xx) so the UI
        // degrades without crashing — the endpoint may not exist yet or
        // the record may not have been created.
        const status = error?.response?.status
        if (status && status >= 400 && status < 500) {
          return null
        }
        throw error
      }
    },
    enabled: !!clinicId,
    staleTime: 0,       // always fetch fresh data when component mounts
    gcTime: 1000 * 60 * 10, // keep in cache for 10 min between mounts
    retry: false,       // don't retry — endpoint may not exist in current backend
  })
}

export function useUpdateIntegrations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clinicId, data }: { clinicId: string; data: Partial<IntegrationSettings> }) => {
      const { data: result } = await api.put(`/clinics/${clinicId}/settings/integrations`, data)
      return result as IntegrationSettings
    },
    onSuccess: (savedData, variables) => {
      // Immediately update the cache with the full record returned by the
      // server (Prisma upsert returns all fields). This updates the form
      // right away without waiting for an extra refetch.
      queryClient.setQueryData(['integrations', variables.clinicId], savedData)
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
