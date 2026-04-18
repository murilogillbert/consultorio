export interface UpdateServiceDto {
  name?: string
  description?: string
  shortDescription?: string
  category?: string
  duration?: number
  price?: number
  preparation?: string
  onlineBooking?: boolean
  imageUrl?: string
  active?: boolean
}
