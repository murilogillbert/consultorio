export interface CreateCampaignDto {
  clinicId: string
  name: string
  channel: string
  startDate: string
  endDate?: string
  budget?: number
}
