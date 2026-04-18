export interface CreateServiceDto {
  name: string
  description?: string
  shortDescription?: string
  category?: string
  duration: number
  price: number
  preparation?: string
  onlineBooking?: boolean
  imageUrl?: string
  professionalIds?: string[]
  insurancePlanIds?: string[]
}
