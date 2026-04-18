import { prisma } from '../../../config/database'
import { whatsappConfig } from '../../../config/whatsapp'

const whatsappIntegrationSelect = {
  clinicId: true,
  waAccessToken: true,
  waPhoneNumberId: true,
  waVerifyToken: true,
  waAppSecret: true,
} as const

export async function getWhatsappIntegrationByClinicId(clinicId: string) {
  return prisma.integrationSettings.findUnique({
    where: { clinicId },
    select: whatsappIntegrationSelect,
  })
}

export async function getWhatsappIntegrationByPhoneNumberId(phoneNumberId?: string | null) {
  if (!phoneNumberId) {
    return null
  }

  return prisma.integrationSettings.findFirst({
    where: { waPhoneNumberId: phoneNumberId },
    select: whatsappIntegrationSelect,
  })
}

export async function getWhatsappIntegrationByVerifyToken(verifyToken?: string | null) {
  if (!verifyToken) {
    return null
  }

  return prisma.integrationSettings.findFirst({
    where: { waVerifyToken: verifyToken },
    select: whatsappIntegrationSelect,
  })
}

export async function resolveWhatsappCredentials(input: {
  clinicId: string
  waToken?: string
  waPhoneId?: string
}) {
  const settings = await getWhatsappIntegrationByClinicId(input.clinicId)

  return {
    settings,
    accessToken: input.waToken || settings?.waAccessToken || whatsappConfig.accessToken || '',
    phoneNumberId: input.waPhoneId || settings?.waPhoneNumberId || whatsappConfig.phoneNumberId || '',
    verifyToken: settings?.waVerifyToken || whatsappConfig.webhookVerifyToken || '',
    appSecret: settings?.waAppSecret || whatsappConfig.appSecret || '',
  }
}
