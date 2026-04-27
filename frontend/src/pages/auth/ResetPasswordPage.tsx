import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react'
import { api } from '../../services/api'
import { usePublicClinic } from '../../hooks/useClinics'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { data: clinic } = usePublicClinic()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !code || !newPassword) {
      setError('Preencha todos os campos.')
      return
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere.')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    try {
      await api.post('/auth/reset-password', { email, code, newPassword })
      setInfo('Senha atualizada com sucesso. Redirecionando para o login...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Não foi possível redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>{clinic?.name || 'Redefinir senha'}</h1>
          <p>Informe o código recebido por e-mail e sua nova senha</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-success">{info}</div>}

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

          <div className="input-group login-field">
            <label className="input-label">Código (6 dígitos)</label>
            <input
              className="input-field"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
              style={{ width: '100%', letterSpacing: 4 }}
            />
          </div>

          <div className="input-group login-field-password">
            <label className="input-label">Nova senha</label>
            <div className="login-password-wrapper">
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError('') }}
              />
              <button type="button" className="login-show-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="input-group login-field-password">
            <label className="input-label">Confirmar nova senha</label>
            <input
              className="input-field"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError('') }}
            />
          </div>

          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
            {loading ? 'Atualizando...' : 'Redefinir senha'}
          </button>

          <div className="login-forgot">
            <Link to="/login" className="btn btn-ghost btn-sm">← Voltar ao login</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
