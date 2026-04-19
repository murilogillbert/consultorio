import { Router } from 'express'
import { AuthController } from '../modules/auth/controllers/authController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'

const r = Router()
const authController = new AuthController()

// Login JWT exchange
r.post('/login', authController.login)

// Gmail OAuth — start (requires auth: user must be logged in to link their clinic)
// Frontend sends clinicId + returnUrl in the POST body and expects JSON { authUrl }
r.post('/google/start', ensureAuthenticated, authController.googleOAuthStart)

// Gmail OAuth — callback from Google (no auth; state JWT carries identity)
r.get('/google/callback', authController.googleOAuthCallback)

// Password recovery
r.post('/forgot-password', authController.forgotPassword)
r.post('/reset-password', authController.resetPassword)

// Token refresh
r.post('/refresh', authController.refreshToken)

// Logout
r.post('/logout', ensureAuthenticated, authController.logout)

export default r
