import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

function ClinicLogo() {
  return (
    <svg width="56" height="56" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#2D6A4F" />
      <path d="M20 8v24M8 20h24" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="20" r="14" stroke="#C9A84C" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Preencha todos os campos')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const user = await signIn(email, password)

      if (user.role === 'ADMIN') {
        navigate('/admin')
      } else if (user.role === 'RECEPTIONIST') {
        navigate('/recepcao')
      } else if (user.role === 'PROFESSIONAL') {
        navigate('/profissional')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'E-mail ou senha inválidos'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <ClinicLogo />
          </div>
          <h1>Clínica Vitalis</h1>
          <p>Acesse o painel de gestão</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div className="login-error">{error}</div>
          )}

          <div className="input-group login-field">
            <label className="input-label">E-mail</label>
            <input
              className="input-field"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              style={{ width: '100%' }}
            />
          </div>

          <div className="input-group login-field-password">
            <label className="input-label">Senha</label>
            <div className="login-password-wrapper">
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
              />
              <button
                type="button"
                className="login-show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="login-forgot">
            <button type="button" className="btn btn-ghost btn-sm">
              Esqueci minha senha
            </button>
          </div>
        </form>

        <div className="login-back">
          <Link to="/" className="btn btn-ghost btn-sm">
            ← Voltar ao Site
          </Link>
        </div>
      </div>
    </div>
  )
}
