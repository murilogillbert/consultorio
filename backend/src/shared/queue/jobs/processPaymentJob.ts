import { prisma } from '../../../config/database'

/**
 * Job: verifica pagamentos pendentes vencidos e os marca como OVERDUE.
 * Executado periodicamente pelo billingWorker.
 */
export async function processPaymentJob(): Promise<void> {
  try {
    const overduePayments = await prisma.payment.updateMany({
      where: {
        status: 'PENDING',
        dueAt:  { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    })

    if (overduePayments.count > 0) {
      console.log(`[Job] processPaymentJob: ${overduePayments.count} pagamento(s) marcado(s) como OVERDUE`)
    }
  } catch (err) {
    console.error('[Job] processPaymentJob falhou:', err)
  }
}
