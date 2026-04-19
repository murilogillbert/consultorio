/**
 * gmailWatchService.ts
 * Sets up (and tears down) the Gmail push-notification subscription
 * that pipes INBOX events into our Google Pub/Sub topic.
 *
 * Pre-conditions:
 *  - IntegrationSettings must have gmailClientId/Secret/AccessToken (i.e. OAuth done)
 *  - IntegrationSettings must have pubsubProjectId + pubsubTopicName
 */

import { prisma } from '../../../../config/database'
import { AppError } from '../../../../shared/errors/AppError'
import { GmailApiService } from './gmailApiService'

const gmailApi = new GmailApiService()

export interface WatchResult {
  historyId: string
  expiresAt: Date
}

/**
 * Start (or renew) a Gmail watch subscription for the given clinic.
 * Stores the returned historyId and expiration in IntegrationSettings.
 */
export async function setupGmailWatch(clinicId: string): Promise<WatchResult> {
  const settings = await prisma.integrationSettings.findUnique({
    where: { clinicId },
  })

  if (!settings) {
    throw new AppError('Configurações de integração não encontradas para esta clínica', 404)
  }

  if (!settings.gmailConnected || !settings.gmailAccessToken) {
    throw new AppError('Gmail não autenticado. Conclua o OAuth antes de ativar notificações.', 422)
  }

  if (!settings.pubsubProjectId || !settings.pubsubTopicName) {
    throw new AppError(
      'Configure o Project ID e o Topic Name do Pub/Sub antes de ativar notificações.',
      422,
    )
  }

  const topicName = `projects/${settings.pubsubProjectId}/topics/${settings.pubsubTopicName}`

  const watchResp = await gmailApi.watch(clinicId, topicName)

  // Google returns expiration as epoch milliseconds (as a string)
  const expiresAt = new Date(Number(watchResp.expiration))

  await prisma.integrationSettings.update({
    where: { clinicId },
    data: {
      gmailHistoryId: watchResp.historyId,
      pubsubWatchExpiresAt: expiresAt,
    },
  })

  console.log(
    `[Gmail Watch] Clínica ${clinicId}: watch ativo até ${expiresAt.toISOString()} (historyId ${watchResp.historyId})`,
  )

  return { historyId: watchResp.historyId, expiresAt }
}

/**
 * Stop the Gmail watch subscription for the given clinic.
 */
export async function stopGmailWatch(clinicId: string): Promise<void> {
  const settings = await prisma.integrationSettings.findUnique({
    where: { clinicId },
  })

  if (!settings?.gmailConnected) {
    return // nothing to stop
  }

  try {
    await gmailApi.stopWatch(clinicId)
  } catch (err: any) {
    // Log but don't throw — best effort cleanup
    console.warn(`[Gmail Watch] Erro ao parar watch para clínica ${clinicId}:`, err?.message)
  }

  await prisma.integrationSettings.update({
    where: { clinicId },
    data: {
      pubsubWatchExpiresAt: null,
      gmailHistoryId: null,
    },
  })

  console.log(`[Gmail Watch] Watch cancelado para clínica ${clinicId}`)
}

/**
 * Returns all clinics whose Gmail watch is expiring within the next `windowMs` ms
 * (default: within 48 hours) or has already expired.
 */
export async function findClinicsNeedingWatchRenewal(
  windowMs = 48 * 60 * 60 * 1000,
): Promise<string[]> {
  const cutoff = new Date(Date.now() + windowMs)

  const results = await prisma.integrationSettings.findMany({
    where: {
      gmailConnected: true,
      pubsubProjectId: { not: null },
      pubsubTopicName: { not: null },
      OR: [
        { pubsubWatchExpiresAt: null },
        { pubsubWatchExpiresAt: { lte: cutoff } },
      ],
    },
    select: { clinicId: true },
  })

  return results.map((r) => r.clinicId)
}
