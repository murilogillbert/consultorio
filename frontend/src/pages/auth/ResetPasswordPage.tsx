import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { api } from '../../services/api'
import { usePublicClinic } from '../../hooks/useClinics'

type ResetStep = 'code' | 'password'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState<ResetStep>('code')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { data: clinic } = usePublicClinic()

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !code) {
      setError('Informe e-mail e codigo.')
      return
    }

    setLoading(true)
    setError('')
    setInfo('')
    try {
      await api.post('/auth/verify-reset-code', { email, code })
      setStep('password')
      setInfo('Codigo confirmado. Agora defina sua nova senha.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Codigo invalido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !code || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos.')
      return
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmacao de senha nao confere.')
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
      setStep('code')
      setNewPassword('')
      setConfirmPassword('')
      setError(err?.response?.data?.message || 'Nao foi possivel redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>{clinic?.name || 'Redefinir senha'}</h1>
          <p>{step === 'code' ? 'Confirme o codigo recebido por e-mail' : 'Escolha uma nova senha'}</p>
        </div>

        <form onSubmit={step === 'code' ? verifyCode : resetPassword}>
          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-success">{info}</div>}

          {step === 'code' && (
            <>
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
                <label className="input-label">Codigo (6 digitos)</label>
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
            </>
          )}

          {step === 'password' && (
            <>
              <div className="input-group login-field-password">
                <label className="input-label">Nova senha</label>
                <div className="login-password-wrapper">
                  <input
                    className="input-field"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimo 6 caracteres"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError('') }}
                  />
                  <button
                    type="button"
                    className="login-show-password"
                    onClick={() => setShowNewPassword(v => !v)}
                    aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group login-field-password">
                <label className="input-label">Confirmar nova senha</label>
                <div className="login-password-wrapper">
                  <input
                    className="input-field"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                  />
                  <button
                    type="button"
                    className="login-show-password"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    aria-label={showConfirmPassword ? 'Ocultar confirmacao de senha' : 'Mostrar confirmacao de senha'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : step === 'code' ? <ShieldCheck size={18} /> : <KeyRound size={18} />}
            {loading ? 'Validando...' : step === 'code' ? 'Confirmar codigo' : 'Redefinir senha'}
          </button>

          {step === 'password' && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => { setStep('code'); setInfo(''); setNewPassword(''); setConfirmPassword('') }}
            >
              Alterar e-mail ou codigo
            </button>
          )}

          <div className="login-forgot">
            <Link to="/login" className="btn btn-ghost btn-sm">Voltar ao login</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
