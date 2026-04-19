import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/AuthService'
import { AuthRepository } from '../repositories/AuthRepository'
import { GoogleOAuthService } from '../services/GoogleOAuthService'
import { forgotPasswordService } from '../services/forgotPasswordService'
import { resetPasswordService } from '../services/resetPasswordService'
import { refreshTokenService } from '../services/refreshTokenService'

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body
      const authRepository = new AuthRepository()
      const authService = new AuthService(authRepository)
      const result = await authService.executeLogin({ email, password })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async googleOAuthStart(req: Request, res: Response, next: NextFunction) {
    try {
      const clinicId = req.query.clinicId as string
      const returnUrl = req.query.returnUrl as string | undefined
      const userId = (req as any).user?.id

      if (!userId) {
        res.status(401).json({ error: 'Autenticação necessária' })
        return
      }

      const service = new GoogleOAuthService()
      const { authUrl } = await service.createAuthorizationUrl(req, {
        clinicId,
        userId,
        returnUrl,
      })

      res.redirect(authUrl)
    } catch (err) {
      next(err)
    }
  }

  async googleOAuthCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const service = new GoogleOAuthService()
      const { redirectUrl } = await service.handleCallback(req)
      res.redirect(redirectUrl)
    } catch (err) {
      next(err)
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body
      await forgotPasswordService(email)
      res.status(200).json({ message: 'Se o e-mail existir, você receberá um código de recuperação.' })
    } catch (err) {
      next(err)
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, newPassword } = req.body
      await resetPasswordService(email, otp, newPassword)
      res.status(200).json({ message: 'Senha redefinida com sucesso.' })
    } catch (err) {
      next(err)
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.body.token || req.headers['x-refresh-token']
      const result = await refreshTokenService(token as string)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ message: 'Desconectado com sucesso.' })
    } catch (err) {
      next(err)
    }
  }
}
