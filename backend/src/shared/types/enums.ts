export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  IN_PROGRESS = 'IN_PROGRESS',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum MessageDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export enum MessageChannel {
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
  EMAIL = 'EMAIL',
  INTERNAL = 'INTERNAL',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  MEMBER = 'MEMBER',
  PATIENT = 'PATIENT',
  PROFESSIONAL = 'PROFESSIONAL',
}
