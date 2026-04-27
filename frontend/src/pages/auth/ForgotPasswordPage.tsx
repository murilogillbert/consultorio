import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Loader2, ArrowRight } from 'lucide-react'
import { api } from '../../services/api'
import { usePublicClinic } from '../../hooks/useClinics'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { data: clinic } = usePublicClinic()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Informe seu e-mail.')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setInfo(data?.message || 'Enviamos um código para o e-mail informado.')
      setTimeout(() => navigate(`/redefinir-senha?email=${encodeURIComponent(email)}`), 1200)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Não foi possível processar a solicitação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>{clinic?.name || 'Recuperar acesso'}</h1>
          <p>Informe seu e-mail para receber um código de recuperação</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-success">{info}</div>}

          <div className="input-group login-field">
            <label className="input-label">E-mail cadastrado</label>
            <input
              className="input-field"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              style={{ width: '100%' }}
            />
          </div>

          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
            {loading ? 'Enviando...' : 'Enviar código'}
          </button>

          <div className="login-forgot" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/login" className="btn btn-ghost btn-sm">← Voltar ao login</Link>
            <Link to="/redefinir-senha" className="btn btn-ghost btn-sm">
              Já tenho um código <ArrowRight size={14} />
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
