// Express Request type augmentation
import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string
        clinicId?: string
      }
    }
  }
}

export {}
