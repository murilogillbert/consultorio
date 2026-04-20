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

type GoogleOAuthCredentials = {
  clientId: string
  clientSecret: string
}

function tryExtractCredentialValue(rawValue: string, key: 'clientId' | 'clientSecret') {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return ''
  }

  const regex = key === 'clientId'
    ? /client[_-]?id["']?\s*[:=]\s*["']([^"']+)["']/i
    : /client[_-]?secret["']?\s*[:=]\s*["']([^"']+)["']/i

  const directMatch = trimmed.match(regex)
  if (directMatch?.[1]) {
    return directMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(trimmed) as any
    const source = parsed?.web ?? parsed?.installed ?? parsed

    if (key === 'clientId') {
      return String(source?.client_id ?? source?.clientId ?? '').trim()
    }

    return String(source?.client_secret ?? source?.clientSecret ?? '').trim()
  } catch {
    return ''
  }
}

function normalizeCredentialValue(rawValue: string | null | undefined, key: 'clientId' | 'clientSecret') {
  const input = String(rawValue ?? '').trim()
  if (!input) {
    return ''
  }

  const extracted = tryExtractCredentialValue(input, key)
  return (extracted || input)
    .trim()
    .replace(/^[\s"'`]+|[\s"',`]+$/g, '')
    .trim()
}

function getNormalizedGoogleCredentials(settings: { gmailClientId?: string | null; gmailClientSecret?: string | null }) {
  const clientId = normalizeCredentialValue(settings.gmailClientId, 'clientId')
  const clientSecret = normalizeCredentialValue(settings.gmailClientSecret, 'clientSecret')

  if (!clientId || !clientSecret) {
    throw new AppError('Salve Client ID e Client Secret do Gmail antes de autenticar', 422)
  }

  if (!clientId.includes('.apps.googleusercontent.com')) {
    throw new AppError(
      'Client ID do Google parece invalido. Use um OAuth Client ID do tipo "Aplicativo Web" e cole apenas o valor do client_id.',
      422,
    )
  }

  return { clientId, clientSecret } satisfies GoogleOAuthCredentials
}

function normalizePublicApiUrl(url: string) {
  return url
    .trim()
    .replace(/\/$/, '')
    .replace(/\/api$/, '')
}

function resolveRequestBaseUrl(req: Request) {
  if (process.env.PUBLIC_API_URL) {
    return normalizePublicApiUrl(process.env.PUBLIC_API_URL)
  }

  const protocol = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim()
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim()

  if (!host) {
    throw new AppError('Nao foi possivel determinar a URL publica da API', 500)
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
    throw new AppError(data.error_description || data.error || 'Falha ao trocar o codigo OAuth do Google', 400)
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
      throw new AppError('clinicId e obrigatorio para iniciar a autenticacao do Gmail', 400)
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
      throw new AppError('Voce nao tem acesso a esta clinica', 403)
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { clinicId: input.clinicId },
    })

    const credentials = getNormalizedGoogleCredentials(settings ?? {})
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
      client_id: credentials.clientId,
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
      throw new AppError('State OAuth invalido', 400)
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
          gmail_message: 'Codigo OAuth do Google ausente',
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
        throw new AppError('Voce nao tem mais acesso a esta clinica', 403)
      }

      const settings = await prisma.integrationSettings.findUnique({
        where: { clinicId: state.clinicId },
      })

      const credentials = getNormalizedGoogleCredentials(settings ?? {})
      const redirectUri = `${resolveRequestBaseUrl(req)}/api/auth/google/callback`
      const tokens = await exchangeCodeForTokens({
        code,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        redirectUri,
      })

      await prisma.integrationSettings.upsert({
        where: { clinicId: state.clinicId },
        update: {
          gmailClientId: credentials.clientId,
          gmailClientSecret: credentials.clientSecret,
          gmailAccessToken: tokens.access_token,
          gmailRefreshToken: tokens.refresh_token || settings?.gmailRefreshToken,
          gmailTokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          gmailConnected: true,
        },
        create: {
          clinicId: state.clinicId,
          gmailClientId: credentials.clientId,
          gmailClientSecret: credentials.clientSecret,
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
        : 'Falha ao concluir a autenticacao do Gmail'

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

    const credentials = getNormalizedGoogleCredentials(settings ?? {})
    const currentToken = settings?.gmailAccessToken
    const expiresAt = settings?.gmailTokenExpiresAt

    if (currentToken && (!expiresAt || expiresAt.getTime() > Date.now() + 60_000)) {
      return currentToken
    }

    if (!settings?.gmailRefreshToken) {
      throw new AppError('Gmail ainda nao autenticado. Faca a conexao OAuth primeiro.', 422)
    }

    const refreshed = await refreshAccessToken({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      refreshToken: settings.gmailRefreshToken,
    })

    await prisma.integrationSettings.update({
      where: { clinicId },
      data: {
        gmailClientId: credentials.clientId,
        gmailClientSecret: credentials.clientSecret,
        gmailAccessToken: refreshed.access_token,
        gmailTokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null,
        gmailConnected: true,
      },
    })

    return refreshed.access_token
  }
}
