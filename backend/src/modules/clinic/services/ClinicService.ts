import { ClinicRepository } from '../repositories/ClinicRepository'
import { AppError } from '../../../shared/errors/AppError'
import { Prisma } from '@prisma/client'
import { GoogleOAuthService } from '../../auth/services/GoogleOAuthService'

export class ClinicService {
  constructor(private clinicRepository: ClinicRepository) { }

  async executeCreate(data: Prisma.ClinicCreateInput) {
    if (!data.name) {
      throw new AppError('Nome da clínica é obrigatório', 400)
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
      throw new AppError('Clínica não encontrada', 404)
    }

    return clinic
  }

  async executeUpdate(id: string, data: Prisma.ClinicUpdateInput) {
    const clinicExists = await this.clinicRepository.findById(id)

    if (!clinicExists) {
      throw new AppError('Clínica não existe para atualizar', 404)
    }

    return this.clinicRepository.update(id, data)
  }

  async executeGetByUserId(userId: string) {
    const clinic = await this.clinicRepository.findFirstByUserId(userId)

    if (!clinic) {
      throw new AppError('Nenhuma clínica encontrada para este usuário', 404)
    }

    return clinic
  }

  async getIntegrations(clinicId: string) {
    return this.clinicRepository.findIntegrationsByClinic(clinicId)
  }

  async updateIntegrations(clinicId: string, data: any) {
    return this.clinicRepository.updateIntegrations(clinicId, data)
  }

  async testIntegration(clinicId: string, type: string) {
    const settings = await this.clinicRepository.findIntegrationsByClinic(clinicId)
    if (!settings) {
      throw new AppError('Configurações de integração não encontradas', 404)
    }

    if (type === 'whatsapp') {
      const token = settings.waAccessToken
      const phoneId = settings.waPhoneNumberId
      if (!token || !phoneId) {
        throw new AppError('Token ou Phone Number ID não configurados', 422)
      }
      const url = `https://graph.facebook.com/v19.0/${phoneId}?access_token=${token}`
      const resp = await fetch(url)
      const json = await resp.json() as any
      if (!resp.ok || json.error) {
        await this.clinicRepository.updateIntegrations(clinicId, { waConnected: false })
        throw new AppError(json.error?.message || 'Token inválido ou expirado', 400)
      }
      await this.clinicRepository.updateIntegrations(clinicId, { waConnected: true })
      return { ok: true, message: 'WhatsApp conectado com sucesso', detail: json.display_phone_number || json.name }
    }

    if (type === 'instagram') {
      const token = settings.igAccessToken
      const pageId = settings.igPageId
      if (!token || !pageId) {
        throw new AppError('Token ou Page ID não configurados', 422)
      }
      const url = `https://graph.facebook.com/v19.0/${pageId}?fields=name,instagram_business_account&access_token=${token}`
      const resp = await fetch(url)
      const json = await resp.json() as any
      if (!resp.ok || json.error) {
        await this.clinicRepository.updateIntegrations(clinicId, { igConnected: false })
        throw new AppError(json.error?.message || 'Token inválido ou expirado', 400)
      }
      await this.clinicRepository.updateIntegrations(clinicId, { igConnected: true })
      return { ok: true, message: 'Credenciais do Instagram validadas com sucesso', detail: json.name }
    }

    if (type === 'mercadopago') {
      const token = settings.mpAccessTokenProd
      if (!token) {
        throw new AppError('Access Token de produção não configurado', 422)
      }
      const url = `https://api.mercadopago.com/v1/payment_methods`
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const json = await resp.json() as any
      if (!resp.ok || json.error) {
        await this.clinicRepository.updateIntegrations(clinicId, { mpConnected: false })
        throw new AppError(json.message || 'Token inválido ou sem permissão', 400)
      }
      await this.clinicRepository.updateIntegrations(clinicId, { mpConnected: true })
      return { ok: true, message: 'Mercado Pago conectado com sucesso' }
    }

    if (type === 'gmail') {
      const googleOAuthService = new GoogleOAuthService()
      const accessToken = await googleOAuthService.getValidAccessToken(clinicId)
      const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await resp.json() as any
      if (!resp.ok || json.error) {
        throw new AppError(json.error?.message || 'Token inválido ou expirado', 400)
      }
      return { ok: true, message: 'Gmail conectado com sucesso', detail: json.emailAddress }
    }

    throw new AppError('Tipo de integração não suportado', 400)
  }
}