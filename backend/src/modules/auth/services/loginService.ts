import { AuthService } from './AuthService'
import { AuthRepository } from '../repositories/AuthRepository'

export async function loginService(email: string, password: string) {
  const authService = new AuthService(new AuthRepository())
  return authService.executeLogin({ email, password })
}
