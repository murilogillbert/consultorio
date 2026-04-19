export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
} as const

export type PaymentStatusType = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES]
