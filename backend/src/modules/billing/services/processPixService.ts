import { prisma } from '../../../config/database'
import { GenerateChargeDto } from '../dtos/generateChargeDto'
import { mpCreatePix } from '../../../shared/providers/payment/mercadoPagoApi'

/**
 * Generates a PIX charge via the Mercado Pago API.
 *
 * The access token is read from IntegrationSettings.mpAccessTokenProd for the
 * clinic linked to the conversation. If none is found it falls back to the
 * MP_ACCESS_TOKEN environment variable (useful for local dev/sandbox).
 */
export async function processPixService(dto: GenerateChargeDto): Promise<{
  pixCode: string
  gatewayId: string
}> {
  console.log(`[Billing] Gerando cobrança PIX: R$ ${dto.amount.toFixed(2)}`)

  const accessToken = await resolveAccessToken(dto.clinicId)

  // Fallback: sandbox mode with fake codes when no token is configured
  if (!accessToken) {
    console.warn('[Billing] PIX: nenhum access token configurado, usando modo sandbox')
    return buildFakePix(dto.amount)
  }

  const payerEmail = dto.patientEmail ?? 'paciente@clinica.com'
  const idempotencyKey = `pix-${dto.conversationId ?? dto.appointmentId ?? Date.now()}-${dto.amount}`

  const result = await mpCreatePix({
    accessToken,
    amount: dto.amount,
    description: dto.description ?? 'Consulta médica',
    payerEmail,
    idempotencyKey,
  })

  return {
    pixCode: result.pixCode,
    gatewayId: result.gatewayId,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveAccessToken(clinicId?: string): Promise<string | null> {
  if (clinicId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { clinicId },
      select: { mpAccessTokenProd: true },
    })
    if (settings?.mpAccessTokenProd) return settings.mpAccessTokenProd
  }
  return process.env.MP_ACCESS_TOKEN ?? null
}

/** Returns a structurally valid fake PIX code for sandbox/demo testing */
function buildFakePix(amount: number): { pixCode: string; gatewayId: string } {
  const amountStr = String(amount.toFixed(2)).replace('.', '')
  const fakePixCode =
    '00020126580014BR.GOV.BCB.PIX0136' +
    Math.random().toString(36).substring(2, 38) +
    '5204000053039865406' +
    amountStr +
    '5802BR5913Psicologia6009SaoPaulo62070503***6304'

  return {
    pixCode: fakePixCode,
    gatewayId: `pix_sandbox_${Date.now()}`,
  }
}
