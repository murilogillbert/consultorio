export interface CreateUserDto {
  name: string
  email: string
  password?: string
  role?: string
  phone?: string
  clinicId?: string
  clinicRole?: string
}
