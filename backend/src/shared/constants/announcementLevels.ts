export const ANNOUNCEMENT_URGENCY = {
  NORMAL: 'NORMAL',
  IMPORTANT: 'IMPORTANT',
  URGENT: 'URGENT',
} as const

export const ANNOUNCEMENT_AUDIENCE = {
  ALL: 'ALL',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  PROFESSIONALS: 'PROFESSIONALS',
  PATIENTS: 'PATIENTS',
} as const

export type AnnouncementUrgency = (typeof ANNOUNCEMENT_URGENCY)[keyof typeof ANNOUNCEMENT_URGENCY]
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCE)[keyof typeof ANNOUNCEMENT_AUDIENCE]
