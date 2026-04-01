import { Router } from 'express'
import { AuthController } from '../modules/auth/controllers/authController'

const r = Router()
const authController = new AuthController()

// Login JWT exchange
r.post('/login', authController.login)

// Endpoint to refresh token (future)
// r.post('/refresh', authController.refresh)

export default r
