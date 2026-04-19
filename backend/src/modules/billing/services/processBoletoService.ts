import { prisma } from '../../../config/database'
import { GenerateChargeDto } from '../dtos/generateChargeDto'
import { mpCreateBoleto } from '../../../shared/providers/payment/mercadoPagoApi'

/**
 * Generates a Boleto charge via the Mercado Pago API.
 *
 * Requires the patient's name, email, and CPF.
 * Falls back to a stub URL when no access token is configured.
 */
export async function processBoletoService(dto: GenerateChargeDto): Promise<{
  boletoUrl: string
  gatewayId: string
}> {
  console.log(`[Billing] Gerando boleto: R$ ${dto.amount.toFixed(2)}`)

  const accessToken = await resolveAccessToken(dto.clinicId)

  if (!accessToken) {
    console.warn('[Billing] Boleto: nenhum access token configurado, usando modo sandbox')
    return {
      boletoUrl: `https://boleto.sandbox.com/${Date.now()}`,
      gatewayId: `boleto_sandbox_${Date.now()}`,
    }
  }

  const nameParts = (dto.patientName ?? 'Paciente Clínica').trim().split(' ')
  const firstName = nameParts[0] ?? 'Paciente'
  const lastName = nameParts.slice(1).join(' ') || 'Clínica'
  const cpf = (dto.patientCpf ?? '').replace(/\D/g, '') || '00000000000'
  const email = dto.patientEmail ?? 'paciente@clinica.com'
  const idempotencyKey = `boleto-${dto.conversationId ?? dto.appointmentId ?? Date.now()}-${dto.amount}`

  const result = await mpCreateBoleto({
    accessToken,
    amount: dto.amount,
    description: dto.description ?? 'Consulta médica',
    payerEmail: email,
    payerFirstName: firstName,
    payerLastName: lastName,
    payerCpf: cpf,
    idempotencyKey,
  })

  return {
    boletoUrl: result.boletoUrl,
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
