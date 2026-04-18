export interface AuditFilterDto {
  clinicId?: string
  userId?: string
  action?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}
