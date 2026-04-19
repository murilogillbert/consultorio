export interface CreateProfessionalDto {
  userId: string
  crm?: string
  councilType?: string
  specialty?: string
  bio?: string
  languages?: string
  commissionPct?: number
  schedules?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  serviceIds?: string[]
  active?: boolean
}
