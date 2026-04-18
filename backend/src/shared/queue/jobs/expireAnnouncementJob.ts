import { prisma } from '../../../config/database'

/**
 * Job: desativa comunicados cuja data de expiração já passou.
 * Executado periodicamente pelo auditWorker.
 */
export async function expireAnnouncementJob(): Promise<void> {
  try {
    const result = await prisma.announcement.updateMany({
      where: {
        active:    true,
        expiresAt: { lt: new Date() },
      },
      data: { active: false },
    })
    if (result.count > 0) {
      console.log(`[Job] expireAnnouncementJob: ${result.count} comunicado(s) expirado(s)`)
    }
  } catch (err) {
    console.error('[Job] expireAnnouncementJob falhou:', err)
  }
}
