export interface CreateAnnouncementDto {
  clinicId: string
  publishedById: string
  title: string
  content: string
  fileUrl?: string
  urgency?: 'NORMAL' | 'IMPORTANT' | 'URGENT'
  audience?: 'ALL' | 'ADMIN' | 'STAFF' | 'PROFESSIONALS'
  audienceIds?: string
  expiresAt?: string
}
