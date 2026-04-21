import { ClinicRepository } from '../repositories/ClinicRepository'
import { AppError } from '../../../shared/errors/AppError'
import { Prisma } from '@prisma/client'
import { GoogleOAuthService } from '../../auth/services/GoogleOAuthService'

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
    return this.clinicRepository.findIntegrationsByClinic(clinicId)
  }

  async updateIntegrations(clinicId: string, data: any) {
    const normalizedData = { ...data }

    if (Object.prototype.hasOwnProperty.call(normalizedData, 'gmailClientId')) {
      normalizedData.gmailClientId = normalizeGoogleIntegrationValue(normalizedData.gmailClientId, 'clientId')
    }

    if (Object.prototype.hasOwnProperty.call(normalizedData, 'gmailClientSecret')) {
      normalizedData.gmailClientSecret = normalizeGoogleIntegrationValue(normalizedData.gmailClientSecret, 'clientSecret')
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
      const url = `https://graph.facebook.com/v19.0/${phoneId}?access_token=${token}`
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
      // Verifica o Page Access Token com campos básicos (sem pages_read_engagement)
      const url = `https://graph.facebook.com/v19.0/${pageId}?fields=id,name&access_token=${token}`
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

    throw new AppError('Tipo de integracao nao suportado', 400)
  }
}
