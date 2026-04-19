export interface GenerateChargeDto {
  conversationId?: string
  appointmentId?: string
  amount: number
  method: 'PIX' | 'CARD' | 'BOLETO'
  description?: string
  patientName?: string
  patientEmail?: string
  patientCpf?: string
}