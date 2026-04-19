export interface CreateJobDto {
  clinicId: string
  title: string
  area?: string
  regime?: string
  location?: string
  hours?: string
  requirements?: string
  responsibilities?: string
  benefits?: string
  expiresAt?: string
}