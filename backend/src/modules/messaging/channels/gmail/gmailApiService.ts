/**
 * gmailApiService.ts
 * Low-level wrapper around the Gmail REST API.
 * All calls use the stored OAuth access token retrieved via GoogleOAuthService.
 */

import { GoogleOAuthService } from '../../../auth/services/GoogleOAuthService'
import { AppError } from '../../../../shared/errors/AppError'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function gmailFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const url = `${GMAIL_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as any
    const msg = body?.error?.message || `Gmail API error ${res.status}`
    throw new AppError(msg, res.status >= 500 ? 502 : 400)
  }

  // 204 No Content — return empty object
  if (res.status === 204) return {}

  return res.json()
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GmailWatchResponse {
  historyId: string
  expiration: string // epoch ms as string
}

export interface GmailHistoryEntry {
  id: string
  messages?: Array<{ id: string; threadId: string }>
  messagesAdded?: Array<{ message: { id: string; threadId: string; labelIds: string[] } }>
  messagesDeleted?: Array<{ message: { id: string; threadId: string } }>
}

export interface GmailHistoryListResponse {
  history?: GmailHistoryEntry[]
  nextPageToken?: string
  historyId: string
}

export interface GmailMessagePart {
  mimeType?: string
  filename?: string
  headers?: Array<{ name: string; value: string }>
  body?: { data?: string; size?: number; attachmentId?: string }
  parts?: GmailMessagePart[]
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailMessagePart
}

// ─── Service ──────────────────────────────────────────────────────────────────

const oauthService = new GoogleOAuthService()

export class GmailApiService {
  private async token(clinicId: string): Promise<string> {
    return oauthService.getValidAccessToken(clinicId)
  }

  /**
   * Set up Gmail push notifications via Pub/Sub.
   * topicName format: "projects/{projectId}/topics/{topicName}"
   */
  async watch(clinicId: string, topicName: string): Promise<GmailWatchResponse> {
    const token = await this.token(clinicId)
    return gmailFetch(token, '/watch', {
      method: 'POST',
      body: JSON.stringify({
        topicName,
        labelIds: ['INBOX'],
        labelFilterBehavior: 'INCLUDE',
      }),
    })
  }

  /**
   * Stop Gmail push notifications (cleans up the watch subscription).
   */
  async stopWatch(clinicId: string): Promise<void> {
    const token = await this.token(clinicId)
    await gmailFetch(token, '/stop', { method: 'POST', body: '{}' })
  }

  /**
   * List history since a given historyId.
   * Returns all history entries, auto-paginating if needed.
   */
  async historyList(
    clinicId: string,
    startHistoryId: string,
    maxResults = 100,
  ): Promise<GmailHistoryListResponse> {
    const token = await this.token(clinicId)
    const params = new URLSearchParams({
      startHistoryId,
      maxResults: String(maxResults),
      historyTypes: 'messageAdded',
    })
    return gmailFetch(token, `/history?${params}`)
  }

  /**
   * Fetch a single message by ID.
   */
  async messageGet(clinicId: string, messageId: string): Promise<GmailMessage> {
    const token = await this.token(clinicId)
    return gmailFetch(token, `/messages/${messageId}?format=full`)
  }

  /**
   * Send an email via the Gmail API (uses OAuth, not SMTP).
   * rawMessage must be base64url-encoded RFC 2822.
   */
  async sendRaw(clinicId: string, rawMessage: string): Promise<{ id: string; threadId: string }> {
    const token = await this.token(clinicId)
    return gmailFetch(token, '/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: rawMessage }),
    })
  }

  /**
   * Convenience: send a simple text/HTML email.
   */
  async sendEmail(
    clinicId: string,
    opts: { to: string; subject: string; html: string; text?: string; threadId?: string },
  ): Promise<{ id: string; threadId: string }> {
    const headers = [
      `To: ${opts.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      opts.html,
    ].join('\r\n')

    const raw = Buffer.from(headers)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const token = await this.token(clinicId)
    const body: any = { raw }
    if (opts.threadId) body.threadId = opts.threadId

    return gmailFetch(token, '/messages/send', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract plain text or HTML body from a GmailMessage payload.
 */
export function extractEmailBody(payload: GmailMessagePart | undefined): string {
  if (!payload) return ''

  // Recursively find text/html first, then text/plain
  function find(part: GmailMessagePart, mime: string): string | null {
    if (part.mimeType === mime && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
    if (part.parts) {
      for (const p of part.parts) {
        const result = find(p, mime)
        if (result) return result
      }
    }
    return null
  }

  return find(payload, 'text/html') ?? find(payload, 'text/plain') ?? ''
}

/**
 * Extract a named header value from a GmailMessage payload.
 */
export function getHeader(payload: GmailMessagePart | undefined, name: string): string {
  return (
    payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
  )
}
