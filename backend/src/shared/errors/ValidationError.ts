import { AppError } from './AppError'

export class ValidationError extends AppError {
  public readonly fields: Record<string, string>

  constructor(fields: Record<string, string>) {
    super('Erro de validação', 400)
    this.fields = fields
  }
}
