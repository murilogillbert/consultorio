import { AppError } from '../errors/AppError'

export function getFirstString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : undefined
  }

  return undefined
}

export function requireSingleString(value: unknown, fieldName: string): string {
  const normalized = getFirstString(value)

  if (!normalized) {
    throw new AppError(`${fieldName} e obrigatorio`, 400)
  }

  return normalized
}
