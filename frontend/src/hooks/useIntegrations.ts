import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface IntegrationSettings {
  // ── Gmail ──
  gmailClientId?: string
  gmailClientSecret?: string
  gmailAccessToken?: string     // escrita: usado para revogar acesso (envia "")
  gmailRefreshToken?: string    // escrita: usado para revogar acesso (envia "")
  gmailConnected?: boolean

  // ── Pub/Sub (seção do frontend preservada — backend ainda não implementa) ──
  pubsubProjectId?: string
  pubsubTopicName?: string
  pubsubServiceAccount?: string        // escrita: enviado ao backend (plain ou masked)
  pubsubServiceAccountMasked?: string  // leitura: retornado mascarado pelo backend
  pubsubServiceAccountConfigured?: boolean
  pubsubConnected?: boolean
  pubsubWatchExpiresAt?: string | null
  gmailWatchHistoryId?: string | null

  // ── Mercado Pago ──
  accessTokenProdMasked?: string
  accessTokenSandboxMasked?: string
  publicKey?: string           // MP public key (unmasked — safe to display)
  sandboxMode?: boolean        // true = sandbox, false = production
  connected?: boolean          // mpConnected

  // ── WhatsApp ──
  waPhoneNumberId?: string
  waWabaId?: string
  waAccessTokenMasked?: string  // leitura: retornado mascarado pelo backend
  waVerifyTokenMasked?: string
  waAppSecretMasked?: string
  waAccessToken?: string        // escrita: enviado ao backend (plain ou masked)
  waVerifyToken?: string
  waAppSecret?: string
  waConnected?: boolean

  // ── Instagram ──
  igAccountId?: string
  igPageId?: string
  igAccessTokenMasked?: string   // leitura: retornado mascarado pelo backend
  igAccessToken?: string         // escrita: enviado ao backend (plain ou masked)
  igAppSecretMasked?: string
  igAppSecret?: string
  igVerifyTokenMasked?: string
  igVerifyToken?: string
  igConnected?: boolean
  // ── Diagnóstico do modo + endpoints efetivos ──
  igMode?: 'InstagramLogin' | 'FacebookPageLogin' | string
  igGraphVersion?: string
  igOwnerId?: string
  igSendEndpoint?: string
  igSubscribeEndpoint?: string
  igConfirmEndpoint?: string
}

export function useIntegrations(clinicId?: string) {
  return useQuery<IntegrationSettings | null>({
    queryKey: ['integrations', clinicId],
    queryFn: async () => {
      try {
        const { data } = await api.get<IntegrationSettings>(`/clinics/${clinicId}/settings/integrations`)
        return data
      } catch (error: any) {
        const status = error?.response?.status
        if (status && status >= 400 && status < 500) {
          return null
        }
        throw error
      }
    },
    enabled: !!clinicId,
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    retry: false,
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
      queryClient.setQueryData(['integrations', variables.clinicId], savedData)
    },
  })
}

export function useTestIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clinicId, type }: { clinicId: string; type: string }) => {
      const { data } = await api.post<{ ok: boolean; message: string; detail?: string }>(
        `/clinics/${clinicId}/settings/integrations/${type}/test`,
        {}
      )
      return data
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.clinicId] })
    },
  })
}
