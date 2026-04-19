import { BillingRepository } from '../repositories/billingRepository'

const billingRepository = new BillingRepository()

export async function getDelinquencyService() {
  const overdue = await billingRepository.findOverduePayments()
  const totalOverdue = overdue.reduce((sum, p) => sum + p.amount, 0)
  return {
    count: overdue.length,
    totalOverdue,
    payments: overdue,
  }
}