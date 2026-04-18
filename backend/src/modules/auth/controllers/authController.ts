import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/AuthService'
import { AuthRepository } from '../repositories/AuthRepository'
import { GoogleOAuthService } from '../services/GoogleOAuthService'

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

  async startGoogleOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, returnUrl } = req.body as { clinicId?: string; returnUrl?: string }
      const googleOAuthService = new GoogleOAuthService()
      const result = await googleOAuthService.createAuthorizationUrl(req, {
        clinicId: clinicId || '',
        userId: req.user.id,
        returnUrl,
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const googleOAuthService = new GoogleOAuthService()
      const result = await googleOAuthService.handleCallback(req)

      res.redirect(result.redirectUrl)
    } catch (err) {
      next(err)
    }
  }
}
