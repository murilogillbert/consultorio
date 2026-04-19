export interface SendNotificationDto {
  userId?: string
  clinicId?: string
  title: string
  body: string
  type?: string
  data?: Record<string, unknown>
}
