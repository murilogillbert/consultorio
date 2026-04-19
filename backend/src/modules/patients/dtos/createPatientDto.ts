export interface CreatePatientDto {
  userId?: string
  name?: string
  email?: string
  cpf?: string
  phone?: string
  birthDate?: string
  address?: string
  notes?: string
  allergies?: string
  bloodType?: string
  active?: boolean
}
