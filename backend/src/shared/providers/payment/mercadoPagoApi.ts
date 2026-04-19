/**
 * mercadoPagoApi.ts
 *
 * Low-level helper for the Mercado Pago REST API.
 * All methods accept the clinic's access token so they can be used in
 * both the single-token (env var) and per-clinic (DB-stored) scenarios.
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/reference
 */

import { AppError } from '../../errors/AppError'

const MP_BASE = 'https://api.mercadopago.com'

async function mpFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const url = `${MP_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const body = await res.json().catch(() => ({})) as any

  if (!res.ok) {
    const msg = body?.message ?? body?.cause?.[0]?.description ?? `Erro ${res.status} da API do Mercado Pago`
    throw new AppError(msg, res.status >= 500 ? 502 : 400)
  }

  return body
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MpPixResult {
  gatewayId: string
  pixCode: string        // EMV / copia-e-cola code
  pixQrCodeBase64: string
  expiresAt: string      // ISO string
}

export interface MpBoletoResult {
  gatewayId: string
  boletoUrl: string      // PDF / printable boleto page URL
  barcode: string        // numeric code
  expiresAt: string
}

export interface MpCheckoutResult {
  gatewayId: string        // preference ID
  paymentLinkUrl: string   // production checkout URL
  sandboxUrl: string       // sandbox checkout URL
}

export interface MpPaymentStatus {
  id: number
  status: string           // approved | pending | rejected | cancelled | ...
  status_detail: string
  transaction_amount: number
  date_approved?: string
}

// ─── PIX ─────────────────────────────────────────────────────────────────────

export async function mpCreatePix(params: {
  accessToken: string
  amount: number
  description?: string
  payerEmail: string
  idempotencyKey: string
}): Promise<MpPixResult> {
  const { accessToken, amount, description, payerEmail, idempotencyKey } = params

  const data = await mpFetch(accessToken, '/v1/payments', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      transaction_amount: amount,
      description: description ?? 'Pagamento via clínica',
      payment_method_id: 'pix',
      payer: { email: payerEmail },
    }),
  })

  const qr = data.point_of_interaction?.transaction_data
  return {
    gatewayId: String(data.id),
    pixCode: qr?.qr_code ?? '',
    pixQrCodeBase64: qr?.qr_code_base64 ?? '',
    expiresAt: qr?.ticket_url ?? '',
  }
}

// ─── Boleto ──────────────────────────────────────────────────────────────────

export async function mpCreateBoleto(params: {
  accessToken: string
  amount: number
  description?: string
  payerEmail: string
  payerFirstName: string
  payerLastName: string
  payerCpf: string        // numbers only, e.g. "12345678901"
  idempotencyKey: string
}): Promise<MpBoletoResult> {
  const { accessToken, amount, description, payerEmail, payerFirstName, payerLastName, payerCpf, idempotencyKey } = params

  const data = await mpFetch(accessToken, '/v1/payments', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      transaction_amount: amount,
      description: description ?? 'Pagamento via clínica',
      payment_method_id: 'bolbradesco',
      payer: {
        email: payerEmail,
        first_name: payerFirstName,
        last_name: payerLastName,
        identification: { type: 'CPF', number: payerCpf },
      },
    }),
  })

  const details = data.transaction_details
  const barcode = data.barcode?.content ?? ''
  const expiresAt = data.date_of_expiration ?? ''

  return {
    gatewayId: String(data.id),
    boletoUrl: details?.external_resource_url ?? '',
    barcode,
    expiresAt,
  }
}

// ─── Checkout (card / preference) ────────────────────────────────────────────

export async function mpCreateCheckoutPreference(params: {
  accessToken: string
  amount: number
  description: string
  payerEmail?: string
  backUrls?: { success?: string; failure?: string; pending?: string }
  notificationUrl?: string
  idempotencyKey: string
}): Promise<MpCheckoutResult> {
  const { accessToken, amount, description, payerEmail, backUrls, notificationUrl, idempotencyKey } = params

  const body: Record<string, any> = {
    items: [
      {
        title: description,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: amount,
      },
    ],
    payment_methods: {
      installments: 12,
      excluded_payment_types: [{ id: 'ticket' }], // exclude boleto from card preference
    },
  }

  if (payerEmail) body.payer = { email: payerEmail }
  if (backUrls) body.back_urls = backUrls
  if (notificationUrl) body.notification_url = notificationUrl

  const data = await mpFetch(accessToken, '/checkout/preferences', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  })

  return {
    gatewayId: data.id ?? '',
    paymentLinkUrl: data.init_point ?? '',
    sandboxUrl: data.sandbox_init_point ?? '',
  }
}

// ─── Payment lookup ──────────────────────────────────────────────────────────

export async function mpGetPaymentStatus(
  accessToken: string,
  paymentId: string,
): Promise<MpPaymentStatus> {
  return mpFetch(accessToken, `/v1/payments/${paymentId}`)
}
