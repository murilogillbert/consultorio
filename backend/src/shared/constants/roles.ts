export const ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  MEMBER: 'MEMBER',
  PATIENT: 'PATIENT',
  PROFESSIONAL: 'PROFESSIONAL',
} as const

export type RoleType = (typeof ROLES)[keyof typeof ROLES]
