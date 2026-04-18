export interface CreateReviewDto {
  professionalId: string
  appointmentId?: string
  rating: number
  comment?: string
  public?: boolean
}
