import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'

export const errorHandler = (
  err: Error,
  request: Request,
  response: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    response.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    })
    return
  }

  console.error('❌ Não Tratado:', err)

  response.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor',
  })
}
