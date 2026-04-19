export interface UpdateProfessionalDto {
  crm?: string
  councilType?: string
  specialty?: string
  bio?: string
  languages?: string
  commissionPct?: number
  active?: boolean
  schedules?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  avatarUrl?: string
}
