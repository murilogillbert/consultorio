export interface GenerateChargeDto {
  clinicId?: string      // resolved from conversation.clinicId at the service layer
  conversationId?: string
  appointmentId?: string
  amount: number
  method: 'PIX' | 'CARD' | 'BOLETO'
  description?: string
  patientName?: string
  patientEmail?: string
  patientCpf?: string
  /** Notification URL forwarded to Mercado Pago so it posts payment updates */
  notificationUrl?: string
}