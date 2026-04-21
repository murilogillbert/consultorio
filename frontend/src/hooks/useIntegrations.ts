import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface IntegrationSettings {
  // ── Gmail ──
  gmailClientId?: string
  gmailClientSecret?: string
  gmailConnected?: boolean

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
  igAccessTokenMasked?: string  // leitura: retornado mascarado pelo backend
  igAccessToken?: string        // escrita: enviado ao backend (plain ou masked)
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
