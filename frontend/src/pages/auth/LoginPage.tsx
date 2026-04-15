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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 50%, rgba(45,106,79,0.08) 100%)',
      padding: 'var(--space-6)',
    }}>
      <div style={{
        background: 'var(--color-overlay-white)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-12)',
        width: '100%',
        maxWidth: 440,
        boxShadow: 'var(--shadow-elevated)',
        animation: 'scaleIn 400ms ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <ClinicLogo />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
            Clínica Vitalis
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-body)' }}>
            Acesse o painel de gestão
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(139,32,32,0.08)',
              border: '1px solid rgba(139,32,32,0.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-accent-danger)',
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-4)',
            }}>
              {error}
            </div>
          )}

          <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
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

          <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
            <label className="input-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                style={{ width: '100%', paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 13 }}>
              Esqueci minha senha
            </button>
          </div>
        </form>

        <div style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
          <Link to="/" className="btn btn-ghost btn-sm" style={{ fontSize: 13 }}>
            ← Voltar ao Site
          </Link>
        </div>

      </div>
    </div>
  )
}
