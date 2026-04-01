import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/AuthService'
import { AuthRepository } from '../repositories/AuthRepository'

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body

      const authRepository = new AuthRepository()
      const authService = new AuthService(authRepository)

      const result = await authService.executeLogin({ email, password })

      res.status(200).json(result)
    } catch (err) {
      next(err) // pass to global error handler
    }
  }
}
