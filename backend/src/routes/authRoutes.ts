import { Router } from 'express'
import { AuthController } from '../modules/auth/controllers/authController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'

const r = Router()
const authController = new AuthController()

// Login JWT exchange
r.post('/login', authController.login)
r.post('/google/start', ensureAuthenticated, authController.startGoogleOAuth)
r.get('/google/callback', authController.googleCallback)

// Endpoint to refresh token (future)
// r.post('/refresh', authController.refresh)

export default r
