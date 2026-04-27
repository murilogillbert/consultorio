import { ClinicRepository } from '../repositories/ClinicRepository'
import { AppError } from '../../../shared/errors/AppError'
import { Prisma } from '@prisma/client'
import { GoogleOAuthService } from '../../auth/services/GoogleOAuthService'
import jwt from 'jsonwebtoken'

interface PubSubServiceAccount {
  type?: string
  project_id?: string
  private_key_id?: string
  private_key?: string
  client_email?: string
}

function isMaskedCredential(value: unknown) {
  const raw = String(value ?? '').trim()
  return raw.startsWith('*') || raw.startsWith('â€¢') || raw.startsWith('•')
}

function parsePubSubServiceAccount(rawJson: unknown): PubSubServiceAccount {
  const raw = String(rawJson ?? '').trim()
  if (!raw) {
    throw new AppError('Service Account Key (JSON) e obrigatoria.', 422)
  }

  try {
    const parsed = JSON.parse(raw) as PubSubServiceAccount
    if (
      parsed.type !== 'service_account' ||
      !parsed.project_id ||
      !parsed.private_key ||
      !parsed.client_email
    ) {
      throw new Error('invalid')
    }
    return parsed
  } catch {
    throw new AppError('JSON da service account incompleto ou invalido.', 422)
  }
}

function maskPubSubServiceAccount(rawJson: string | null | undefined) {
  if (!rawJson) return undefined

  try {
    const parsed = JSON.parse(rawJson) as PubSubServiceAccount
    return `******************${parsed.client_email || 'configurado'}`
  } catch {
    return '******************configurado'
  }
}

function normalizeTopicName(topicName: string, projectId: string) {
  const trimmed = topicName.trim()
  const prefix = `projects/${projectId}/topics/`
  return trimmed.toLowerCase().startsWith(prefix.toLowerCase())
    ? trimmed.slice(prefix.length)
    : trimmed
}

function buildTopicResource(projectId: string, topicName: string) {
  const normalizedTopic = normalizeTopicName(topicName, projectId)
  return `projects/${encodeURIComponent(projectId)}/topics/${encodeURIComponent(normalizedTopic)}`
}

async function createPubSubAccessToken(serviceAccount: PubSubServiceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const assertion = jwt.sign(
    {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/pubsub',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 55 * 60,
    },
    serviceAccount.private_key!,
    {
      algorithm: 'RS256',
      keyid: serviceAccount.private_key_id,
    },
  )

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const json = await resp.json().catch(() => ({})) as any
  if (!resp.ok || !json.access_token) {
    throw new AppError(json.error_description || json.error || 'Falha ao autenticar a service account do Pub/Sub', 400)
  }
  return json.access_token as string
}

function normalizeGoogleIntegrationValue(value: unknown, key: 'clientId' | 'clientSecret') {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return raw
  }

  const regex = key === 'clientId'
    ? /client[_-]?id["']?\s*[:=]\s*["']([^"']+)["']/i
    : /client[_-]?secret["']?\s*[:=]\s*["']([^"']+)["']/i

  const directMatch = raw.match(regex)
  if (directMatch?.[1]) {
    return directMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(raw) as any
    const source = parsed?.web ?? parsed?.installed ?? parsed
    const extracted = key === 'clientId'
      ? source?.client_id ?? source?.clientId
      : source?.client_secret ?? source?.clientSecret

    if (typeof extracted === 'string') {
      return extracted.trim()
    }
  } catch {
  }

  return raw.replace(/^[\s"'`]+|[\s"',`]+$/g, '').trim()
}

export class ClinicService {
  constructor(private clinicRepository: ClinicRepository) { }

  async executeCreate(data: Prisma.ClinicCreateInput) {
    if (!data.name) {
      throw new AppError('Nome da clinica e obrigatorio', 400)
    }

    const clinic = await this.clinicRepository.create(data)

    return clinic
  }

  async executeList() {
    return this.clinicRepository.list()
  }

  async executeFindById(id: string) {
    const clinic = await this.clinicRepository.findById(id)

    if (!clinic) {
      throw new AppError('Clinica nao encontrada', 404)
    }

    return clinic
  }

  async executeUpdate(id: string, data: Prisma.ClinicUpdateInput) {
    const clinicExists = await this.clinicRepository.findById(id)

    if (!clinicExists) {
      throw new AppError('Clinica nao existe para atualizar', 404)
    }

    return this.clinicRepository.update(id, data)
  }

  async executeGetByUserId(userId: string) {
    const clinic = await this.clinicRepository.findFirstByUserId(userId)

    if (!clinic) {
      throw new AppError('Nenhuma clinica encontrada para este usuario', 404)
    }

    return clinic
  }

  async getIntegrations(clinicId: string) {
    const settings = await this.clinicRepository.findIntegrationsByClinic(clinicId)
    if (!settings) return settings

    const { pubsubServiceAccount, ...safeSettings } = settings as any
    return {
      ...safeSettings,
      pubsubServiceAccountMasked: maskPubSubServiceAccount(pubsubServiceAccount),
      pubsubServiceAccountConfigured: Boolean(pubsubServiceAccount),
    }
  }

  async updateIntegrations(clinicId: string, data: any) {
    const currentSettings = await this.clinicRepository.findIntegrationsByClinic(clinicId)
    const normalizedData = { ...data }

    if (Object.prototype.hasOwnProperty.call(normalizedData, 'gmailClientId')) {
      normalizedData.gmailClientId = normalizeGoogleIntegrationValue(normalizedData.gmailClientId, 'clientId')
    }

    if (Object.prototype.hasOwnProperty.call(normalizedData, 'gmailClientSecret')) {
      normalizedData.gmailClientSecret = normalizeGoogleIntegrationValue(normalizedData.gmailClientSecret, 'clientSecret')
    }

    let pubSubChanged = false
    if (Object.prototype.hasOwnProperty.call(normalizedData, 'pubsubProjectId')) {
      normalizedData.pubsubProjectId = String(normalizedData.pubsubProjectId ?? '').trim() || null
      pubSubChanged = normalizedData.pubsubProjectId !== (currentSettings as any)?.pubsubProjectId
    }

    if (Object.prototype.hasOwnProperty.call(normalizedData, 'pubsubTopicName')) {
      normalizedData.pubsubTopicName = String(normalizedData.pubsubTopicName ?? '').trim() || null
      pubSubChanged = pubSubChanged || normalizedData.pubsubTopicName !== (currentSettings as any)?.pubsubTopicName
    }

    if (Object.prototype.hasOwnProperty.call(normalizedData, 'pubsubServiceAccount')) {
      if (isMaskedCredential(normalizedData.pubsubServiceAccount)) {
        delete normalizedData.pubsubServiceAccount
      } else {
        const value = String(normalizedData.pubsubServiceAccount ?? '').trim() || null
        if (value) parsePubSubServiceAccount(value)
        normalizedData.pubsubServiceAccount = value
        pubSubChanged = pubSubChanged || value !== (currentSettings as any)?.pubsubServiceAccount
      }
    }

    if (pubSubChanged && !Object.prototype.hasOwnProperty.call(normalizedData, 'pubsubConnected')) {
      normalizedData.pubsubConnected = false
    }

    return this.clinicRepository.updateIntegrations(clinicId, normalizedData)
  }

  async testIntegration(clinicId: string, type: string) {
    const settings = await this.clinicRepository.findIntegrationsByClinic(clinicId)
    if (!settings) {
      throw new AppError('Configuracoes de integracao nao encontradas', 404)
    }

    if (type === 'whatsapp') {
      const token = settings.waAccessToken
      const phoneId = settings.waPhoneNumberId
      if (!token || !phoneId) {
        throw new AppError('Token ou Phone Number ID nao configurados', 422)
      }
      const url = `https://graph.facebook.com/v19.0/${phoneId}?fields=display_phone_number,verified_name,code_verification_status&access_token=${token}`
      const resp = await fetch(url)
      const json = await resp.json() as any
      if (!resp.ok || json.error) {
        await this.clinicRepository.updateIntegrations(clinicId, { waConnected: false })
        throw new AppError(json.error?.message || 'Token invalido ou expirado', 400)
      }
      await this.clinicRepository.updateIntegrations(clinicId, { waConnected: true })
      return { ok: true, message: 'WhatsApp conectado com sucesso', detail: json.display_phone_number || json.name }
    }

    if (type === 'instagram') {
      const token = settings.igAccessToken
      const pageId = settings.igPageId
      if (!token || !pageId) {
        throw new AppError('Token ou Page ID nao configurados', 422)
      }
      // /me com Page Access Token retorna dados da própria página sem exigir pages_read_engagement
      const url = `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`
      const resp = await fetch(url)
      const json = await resp.json() as any
      if (!resp.ok || json.error) {
        await this.clinicRepository.updateIntegrations(clinicId, { igConnected: false })
        throw new AppError(json.error?.message || 'Token invalido ou expirado', 400)
      }
      // Tenta obter a conta Instagram vinculada (requer pages_read_engagement aprovado no app)
      let detail = json.name as string
      const igUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${token}`
      const igResp = await fetch(igUrl)
      const igJson = await igResp.json() as any
      if (igResp.ok && !igJson.error && igJson.instagram_business_account?.id) {
        detail = `${json.name} · Instagram ID: ${igJson.instagram_business_account.id}`
      }
      await this.clinicRepository.updateIntegrations(clinicId, { igConnected: true })
      return { ok: true, message: 'Credenciais do Instagram validadas com sucesso', detail }
    }

    if (type === 'mercadopago') {
      const rawToken = (settings as any).mpSandboxMode
        ? settings.mpAccessTokenSandbox
        : settings.mpAccessTokenProd
      const token = rawToken?.replace(/^\uFEFF/, '').trim()
      if (!token) {
        throw new AppError(
          (settings as any).mpSandboxMode
            ? 'Access Token sandbox nao configurado'
            : 'Access Token de producao nao configurado',
          422,
        )
      }
      const url = 'https://api.mercadopago.com/v1/users/me'
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const json = await resp.json() as any
      if (!resp.ok || json.error) {
        await this.clinicRepository.updateIntegrations(clinicId, { mpConnected: false })
        throw new AppError(json.message || 'Token invalido ou sem permissao', 400)
      }
      await this.clinicRepository.updateIntegrations(clinicId, { mpConnected: true })
      const mode = (settings as any).mpSandboxMode ? 'Sandbox' : 'Producao'
      return {
        ok: true,
        message: `Conectado · ${json.email ?? ''}`,
        detail: `Site: ${json.site_id ?? 'N/A'} · Modo: ${mode}`,
      }
    }

    if (type === 'gmail') {
      if (!settings.gmailClientId || !settings.gmailClientSecret) {
        throw new AppError('Salve o Client ID e Client Secret antes de testar', 422)
      }
      if (!settings.gmailAccessToken && !settings.gmailRefreshToken) {
        throw new AppError(
          'Gmail salvo mas ainda nao autenticado. Clique em "Salvar e Autenticar" para concluir o OAuth.',
          422,
        )
      }
      const googleOAuthService = new GoogleOAuthService()
      const accessToken = await googleOAuthService.getValidAccessToken(clinicId)
      const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await resp.json() as any
      if (!resp.ok || json.error) {
        throw new AppError(json.error?.message || 'Token invalido ou expirado', 400)
      }
      return { ok: true, message: 'Gmail conectado com sucesso', detail: json.emailAddress }
    }

    if (type === 'pubsub') {
      const projectId = settings.pubsubProjectId
      const topicName = settings.pubsubTopicName
      const rawServiceAccount = settings.pubsubServiceAccount
      if (!projectId || !topicName || !rawServiceAccount) {
        await this.clinicRepository.updateIntegrations(clinicId, { pubsubConnected: false })
        throw new AppError('Salve Project ID, nome do topico e JSON da service account antes de testar.', 422)
      }

      const serviceAccount = parsePubSubServiceAccount(rawServiceAccount)
      const accessToken = await createPubSubAccessToken(serviceAccount)
      const topicResource = buildTopicResource(projectId, topicName)
      const resp = await fetch(`https://pubsub.googleapis.com/v1/${topicResource}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await resp.json().catch(() => ({})) as any

      if (!resp.ok || json.error) {
        await this.clinicRepository.updateIntegrations(clinicId, { pubsubConnected: false })
        const message = resp.status === 404
          ? 'Topico Pub/Sub nao encontrado. Confirme o Project ID e o nome do topico.'
          : json.error?.message || json.error_description || 'Falha ao validar o topico Pub/Sub.'
        throw new AppError(message, resp.status >= 400 ? resp.status : 400)
      }

      await this.clinicRepository.updateIntegrations(clinicId, { pubsubConnected: true })
      return {
        ok: true,
        message: 'Pub/Sub conectado com sucesso',
        detail: `${projectId}/${normalizeTopicName(topicName, projectId)}`,
      }
    }

    throw new AppError('Tipo de integracao nao suportado', 400)
  }
}
