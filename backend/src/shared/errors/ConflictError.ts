import { AppError } from './AppError'

export class ConflictError extends AppError {
  constructor(message = 'Conflito: recurso já existe') {
    super(message, 409)
  }
}
