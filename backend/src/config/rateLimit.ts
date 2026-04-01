import { Options } from 'express-rate-limit'

export const rateLimitConfig: Partial<Options> = {
  windowMs: 15 * 60 * 1000, 
  max: 200, 
  message: {
    status: 'error',
    message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  },
  standardHeaders: true, 
  legacyHeaders: false,
}
