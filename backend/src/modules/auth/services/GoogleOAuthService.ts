import { Request } from 'express'
import { sign, verify } from 'jsonwebtoken'
import { prisma } from '../../../config/database'
import { env } from '../../../config/env'
import { AppError } from '../../../shared/errors/AppError'

const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ')

type GoogleOAuthStatePayload = {
  type: 'gmail_oauth'
  clinicId: string
  userId: string
  returnUrl?: string
  allowedOrigin?: string
}

function resolveRequestBaseUrl(req: Request) {
  const protocol = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim()
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim()

  if (!host) {
    throw new AppError('Não foi possível determinar a URL pública da API', 500)
  }

  return `${protocol}://${host}`
}

function resolveAllowedOrigin(req: Request, returnUrl?: string) {
  const originHeader = req.get('origin')
  if (originHeader) {
    return originHeader
  }

  const refererHeader = req.get('referer')
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin
    } catch {
    }
  }

  if (returnUrl) {
    try {
      return new URL(returnUrl).origin
    } catch {
    }
  }

  return undefined
}

function buildSafeReturnUrl(returnUrl: string | undefined, allowedOrigin?: string) {
  const fallbackPath = '/admin/configuracoes?tab=integrations'

  if (!returnUrl) {
    return allowedOrigin ? `${allowedOrigin}${fallbackPath}` : fallbackPath
  }

  if (returnUrl.startsWith('/')) {
    return allowedOrigin ? `${allowedOrigin}${returnUrl}` : returnUrl
  }

  try {
    const parsed = new URL(returnUrl)
    if (allowedOrigin && parsed.origin !== allowedOrigin) {
      return `${allowedOrigin}${fallbackPath}`
    }

    return parsed.toString()
  } catch {
    return allowedOrigin ? `${allowedOrigin}${fallbackPath}` : fallbackPath
  }
}

function appendRedirectParams(targetUrl: string, params: Record<string, string>) {
  const isAbsolute = /^https?:\/\//i.test(targetUrl)
  const base = isAbsolute ? undefined : 'http://local'
  const url = new URL(targetUrl, base)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  if (isAbsolute) {
    return url.toString()
  }

  return `${url.pathname}${url.search}${url.hash}`
}

async function exchangeCodeForTokens(input: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const data = await response.json() as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!response.ok || !data.access_token) {
    throw new AppError(data.error_description || data.error || 'Falha ao trocar o código OAuth do Google', 400)
  }

  return data
}

async function refreshAccessToken(input: {
  clientId: string
  clientSecret: string
  refreshToken: string
}) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json() as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!response.ok || !data.access_token) {
    throw new AppError(data.error_description || data.error || 'Falha ao renovar o token do Gmail', 400)
  }

  return data
}

export class GoogleOAuthService {
  async createAuthorizationUrl(req: Request, input: { clinicId: string; userId: string; returnUrl?: string }) {
    if (!input.clinicId) {
      throw new AppError('clinicId é obrigatório para iniciar a autenticação do Gmail', 400)
    }

    const membership = await prisma.systemUser.findUnique({
      where: {
        clinicId_userId: {
          clinicId: input.clinicId,
          userId: input.userId,
        },
      },
    })

    if (!membership || !membership.active) {
      throw new AppError('Você não tem acesso a esta clínica', 403)
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { clinicId: input.clinicId },
    })

    if (!settings?.gmailClientId || !settings.gmailClientSecret) {
      throw new AppError('Salve Client ID e Client Secret do Gmail antes de autenticar', 422)
    }

    const redirectUri = `${resolveRequestBaseUrl(req)}/api/auth/google/callback`
    const allowedOrigin = resolveAllowedOrigin(req, input.returnUrl)
    const returnUrl = buildSafeReturnUrl(input.returnUrl, allowedOrigin)

    const state = sign(
      {
        type: 'gmail_oauth',
        clinicId: input.clinicId,
        userId: input.userId,
        returnUrl,
        allowedOrigin,
      } satisfies GoogleOAuthStatePayload,
      env.JWT_SECRET,
      { expiresIn: '15m' },
    )

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: settings.gmailClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      scope: GOOGLE_OAUTH_SCOPES,
      state,
    }).toString()}`

    return { authUrl, redirectUri }
  }

  async handleCallback(req: Request) {
    const stateToken = typeof req.query.state === 'string' ? req.query.state : undefined
    if (!stateToken) {
      throw new AppError('State OAuth ausente', 400)
    }

    const state = verify(stateToken, env.JWT_SECRET) as GoogleOAuthStatePayload
    if (state.type !== 'gmail_oauth') {
      throw new AppError('State OAuth inválido', 400)
    }

    const safeReturnUrl = buildSafeReturnUrl(state.returnUrl, state.allowedOrigin)
    const googleError = typeof req.query.error === 'string' ? req.query.error : undefined
    const googleErrorDescription = typeof req.query.error_description === 'string' ? req.query.error_description : undefined

    if (googleError) {
      return {
        redirectUrl: appendRedirectParams(safeReturnUrl, {
          tab: 'integrations',
          gmail_oauth: 'error',
          gmail_message: googleErrorDescription || googleError,
        }),
      }
    }

    const code = typeof req.query.code === 'string' ? req.query.code : undefined
    if (!code) {
      return {
        redirectUrl: appendRedirectParams(safeReturnUrl, {
          tab: 'integrations',
          gmail_oauth: 'error',
          gmail_message: 'Código OAuth do Google ausente',
        }),
      }
    }

    try {
      const membership = await prisma.systemUser.findUnique({
        where: {
          clinicId_userId: {
            clinicId: state.clinicId,
            userId: state.userId,
          },
        },
      })

      if (!membership || !membership.active) {
        throw new AppError('Você não tem mais acesso a esta clínica', 403)
      }

      const settings = await prisma.integrationSettings.findUnique({
        where: { clinicId: state.clinicId },
      })

      if (!settings?.gmailClientId || !settings.gmailClientSecret) {
        throw new AppError('Credenciais OAuth do Gmail não configuradas para esta clínica', 422)
      }

      const redirectUri = `${resolveRequestBaseUrl(req)}/api/auth/google/callback`
      const tokens = await exchangeCodeForTokens({
        code,
        clientId: settings.gmailClientId,
        clientSecret: settings.gmailClientSecret,
        redirectUri,
      })

      await prisma.integrationSettings.upsert({
        where: { clinicId: state.clinicId },
        update: {
          gmailAccessToken: tokens.access_token,
          gmailRefreshToken: tokens.refresh_token || settings.gmailRefreshToken,
          gmailTokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          gmailConnected: true,
        },
        create: {
          clinicId: state.clinicId,
          gmailClientId: settings.gmailClientId,
          gmailClientSecret: settings.gmailClientSecret,
          gmailAccessToken: tokens.access_token,
          gmailRefreshToken: tokens.refresh_token,
          gmailTokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          gmailConnected: true,
        },
      })

      return {
        redirectUrl: appendRedirectParams(safeReturnUrl, {
          tab: 'integrations',
          gmail_oauth: 'success',
          gmail_message: 'Conta Google conectada com sucesso',
        }),
      }
    } catch (error: any) {
      await prisma.integrationSettings.updateMany({
        where: { clinicId: state.clinicId },
        data: { gmailConnected: false },
      })

      const message = error instanceof AppError
        ? error.message
        : 'Falha ao concluir a autenticação do Gmail'

      return {
        redirectUrl: appendRedirectParams(safeReturnUrl, {
          tab: 'integrations',
          gmail_oauth: 'error',
          gmail_message: message,
        }),
      }
    }
  }

  async getValidAccessToken(clinicId: string) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { clinicId },
    })

    if (!settings?.gmailClientId || !settings.gmailClientSecret) {
      throw new AppError('Credenciais do Gmail não configuradas', 422)
    }

    const currentToken = settings.gmailAccessToken
    const expiresAt = settings.gmailTokenExpiresAt

    if (currentToken && (!expiresAt || expiresAt.getTime() > Date.now() + 60_000)) {
      return currentToken
    }

    if (!settings.gmailRefreshToken) {
      throw new AppError('Gmail ainda não autenticado. Faça a conexão OAuth primeiro.', 422)
    }

    const refreshed = await refreshAccessToken({
      clientId: settings.gmailClientId,
      clientSecret: settings.gmailClientSecret,
      refreshToken: settings.gmailRefreshToken,
    })

    await prisma.integrationSettings.update({
      where: { clinicId },
      data: {
        gmailAccessToken: refreshed.access_token,
        gmailTokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null,
        gmailConnected: true,
      },
    })

    return refreshed.access_token
  }
}
