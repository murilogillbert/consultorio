import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Loader2, CalendarDays, Clock, UserCheck,
  MessageCircle, Send, CheckCircle, XCircle, LogOut, Lock, Eye, EyeOff, AlertTriangle, X
} from 'lucide-react'
import {
  usePatientLogin, useRegisterPatient,
  usePatientAppointments, usePatientConversation, useSendPatientMessage,
  useCancelPatientAppointment, useSubmitReview,
  getPatientUser, clearPatient, type PatientAppointment
} from '../../hooks/usePatientPortal'
import { useAuth } from '../../contexts/AuthContext'

type Screen = 'login' | 'register' | 'dashboard'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SCHEDULED:   { label: 'Agendada',     cls: 'badge-gold' },
  CONFIRMED:   { label: 'Confirmada',   cls: 'badge-emerald' },
  IN_PROGRESS: { label: 'Em andamento', cls: 'badge-brand' },
  COMPLETED:   { label: 'Concluída',    cls: 'badge-emerald' },
  CANCELLED:   { label: 'Cancelada',    cls: 'badge-danger' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(min: number) {
  if (min >= 60) { const h = Math.floor(min / 60); const m = min % 60; return m ? `${h}h ${m}min` : `${h}h` }
  return `${min} min`
}

// ─── Tela: Login ───────────────────────────────────────────────────────────

function LoginScreen({ onSuccess, onRegister }: { onSuccess: () => void; onRegister: () => void }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const login = usePatientLogin()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login.mutateAsync({ email: email.trim(), password })
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'E-mail ou senha incorretos.')
    }
  }

  return (
    <div className="patient-auth-card animate-fade-in">
      <div className="patient-auth-icon"><Lock size={32} /></div>
      <h2>Minhas Consultas</h2>
      <p>Acesse o portal com seu e-mail e senha cadastrados.</p>

      <form onSubmit={handleSubmit} className="patient-auth-form">
        <div className="input-group">
          <label className="input-label">E-mail</label>
          <input
            className="input-field"
            type="email"
            placeholder="seu@email.com.br"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="input-group">
          <label className="input-label">Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input-field"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="patient-auth-hint error"><XCircle size={14} /> {error}</p>}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={login.isPending}
        >
          {login.isPending
            ? <><Loader2 size={16} className="animate-spin" /> Entrando...</>
            : 'Entrar'}
        </button>
      </form>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border-default)', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Ainda não tem conta?
        </p>
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onRegister}>
          Criar minha conta
        </button>
      </div>
    </div>
  )
}

// ─── Tela: Cadastro ────────────────────────────────────────────────────────

function RegisterScreen({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', cpf: '', phone: '' })
  const [showPass, setShowPass]   = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [error, setError]         = useState('')
  const register  = useRegisterPatient()
  const login     = usePatientLogin()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim()) { setError('Nome e e-mail são obrigatórios.'); return }
    if (form.password.length < 6)                { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    if (form.password !== form.confirm)          { setError('As senhas não coincidem.'); return }

    try {
      await register.mutateAsync({
        name:     form.name.trim(),
        email:    form.email.trim(),
        password: form.password,
        cpf:      form.cpf.trim()   || undefined,
        phone:    form.phone.trim() || undefined,
      })
      // Faz login automático após cadastro
      await login.mutateAsync({ email: form.email.trim(), password: form.password })
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao realizar cadastro. Tente novamente.')
    }
  }

  const isPending = register.isPending || login.isPending

  return (
    <div className="patient-auth-card animate-fade-in">
      <div className="patient-auth-icon" style={{ background: 'rgba(201,168,76,0.12)' }}>
        <UserCheck size={32} color="var(--color-accent-gold)" />
      </div>
      <h2>Criar conta</h2>
      <p>Preencha seus dados para acessar o portal de consultas.</p>

      <form onSubmit={handleSubmit} className="patient-auth-form">
        <div className="input-group">
          <label className="input-label">Nome Completo <span className="required">*</span></label>
          <input className="input-field" placeholder="Seu nome completo" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
        </div>

        <div className="input-group">
          <label className="input-label">E-mail <span className="required">*</span></label>
          <input className="input-field" type="email" placeholder="seu@email.com.br" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>

        <div className="input-group">
          <label className="input-label">Senha <span className="required">*</span></label>
          <div style={{ position: 'relative' }}>
            <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              required style={{ paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPass(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Confirmar senha <span className="required">*</span></label>
          <div style={{ position: 'relative' }}>
            <input className="input-field" type={showConf ? 'text' : 'password'} placeholder="Repita a senha"
              value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
              required style={{ paddingRight: 40 }} />
            <button type="button" onClick={() => setShowConf(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
              {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">CPF</label>
          <input className="input-field" placeholder="000.000.000-00" value={form.cpf}
            onChange={e => setForm({ ...form, cpf: e.target.value })} />
        </div>

        <div className="input-group">
          <label className="input-label">Telefone</label>
          <input className="input-field" placeholder="(11) 99999-9999" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>

        {error && <p className="patient-auth-hint error"><XCircle size={14} /> {error}</p>}

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isPending}>
          {isPending
            ? <><Loader2 size={16} className="animate-spin" /> Cadastrando...</>
            : <><CheckCircle size={16} /> Criar conta</>}
        </button>
      </form>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Já tenho conta</button>
      </div>
    </div>
  )
}

// ─── Tela: Dashboard do paciente ───────────────────────────────────────────

function PatientDashboard({ onLogout }: { onLogout: () => void }) {
  const user = getPatientUser()
  const { data: appointments = [] as PatientAppointment[], isLoading: loadingApps } = usePatientAppointments()
  const { data: convData, isLoading: loadingConv } = usePatientConversation()
  const sendMsg = useSendPatientMessage()
  const [message, setMessage] = useState('')
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<'consultas' | 'chat'>(() =>
    searchParams.get('tab') === 'chat' ? 'chat' : 'consultas'
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convData?.messages])

  const handleSend = async () => {
    const text = message.trim()
    if (!text) return
    setMessage('')
    await sendMsg.mutateAsync(text)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const upcoming = appointments.filter(a => new Date(a.startTime) >= new Date() && a.status !== 'CANCELLED')
  const past     = appointments.filter(a => new Date(a.startTime) <  new Date() || a.status === 'CANCELLED')

  return (
    <div className="patient-dashboard animate-fade-in">
      {/* Header */}
      <div className="patient-dashboard-header">
        <div>
          <h2>Olá, {user?.name?.split(' ')[0]}!</h2>
          <p className="patient-dashboard-sub">{user?.email}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onLogout}>
          <LogOut size={14} /> Sair
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab${tab === 'consultas' ? ' active' : ''}`} onClick={() => setTab('consultas')}>
          <CalendarDays size={14} /> Minhas Consultas
        </button>
        <button className={`tab${tab === 'chat' ? ' active' : ''}`} onClick={() => setTab('chat')}>
          <MessageCircle size={14} /> Chat com a Clínica
        </button>
      </div>

      {/* ── CONSULTAS ── */}
      {tab === 'consultas' && (
        <div>
          {loadingApps && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Loader2 size={24} className="animate-spin" color="var(--color-accent-brand)" />
            </div>
          )}

          {!loadingApps && appointments.length === 0 && (
            <div className="patient-empty">
              <CalendarDays size={40} color="var(--color-text-muted)" />
              <p>Nenhuma consulta encontrada.</p>
              <a href="/agendar" className="btn btn-primary btn-sm">Agendar consulta</a>
            </div>
          )}

          {!loadingApps && appointments.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <a href="/agendar" className="btn btn-primary btn-sm">
                <CalendarDays size={14} /> Agendar nova consulta
              </a>
            </div>
          )}

          {upcoming.length > 0 && (
            <>
              <h3 className="patient-section-title">Próximas consultas</h3>
              <div className="patient-appointments-list">
                {upcoming.map(a => <AppointmentCard key={a.id} appointment={a} />)}
              </div>
            </>
          )}

          {past.length > 0 && (
            <>
              <h3 className="patient-section-title" style={{ marginTop: 24 }}>Histórico</h3>
              <div className="patient-appointments-list">
                {past.map(a => <AppointmentCard key={a.id} appointment={a} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CHAT ── */}
      {tab === 'chat' && (
        <div className="patient-chat">
          <div className="patient-chat-messages">
            {loadingConv && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Loader2 size={20} className="animate-spin" color="var(--color-text-muted)" />
              </div>
            )}
            {!loadingConv && (!convData?.messages || convData.messages.length === 0) && (
              <div className="patient-empty">
                <MessageCircle size={36} color="var(--color-text-muted)" />
                <p>Nenhuma mensagem ainda. Envie uma mensagem para a clínica!</p>
              </div>
            )}
            {convData?.messages.map(msg => {
              const isOut = msg.direction === 'IN' // paciente enviou
              return (
                <div key={msg.id} style={{ alignSelf: isOut ? 'flex-end' : 'flex-start' }}>
                  {!isOut && (
                    <div style={{ fontSize: 11, color: 'var(--color-accent-emerald)', marginBottom: 2, fontWeight: 600 }}>
                      Recepção
                    </div>
                  )}
                  <div className={`message-bubble ${isOut ? 'outgoing' : 'incoming'}`}>
                    {msg.content}
                    <div className="time">
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-bar" style={{ borderTop: '1px solid var(--color-border-default)' }}>
            <input
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKey}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--color-text-primary)' }}
            />
            <button
              className="btn btn-primary btn-icon"
              onClick={handleSend}
              disabled={!message.trim() || sendMsg.isPending}
            >
              {sendMsg.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card de consulta ──────────────────────────────────────────────────────

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            background: 'none', border: 'none', padding: 2,
            cursor: readonly ? 'default' : 'pointer',
            color: star <= (hover || value) ? 'var(--color-accent-gold)' : 'var(--color-border-default)',
            fontSize: 22, lineHeight: 1, transition: 'color 150ms ease',
          }}
          disabled={readonly}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function AppointmentCard({ appointment: a }: { appointment: PatientAppointment }) {
  const [confirming, setConfirming] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewMsg, setReviewMsg] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const cancel = useCancelPatientAppointment()
  const submitReview = useSubmitReview()
  const status = STATUS_LABEL[a.status] || { label: a.status, cls: 'badge-gold' }
  const proName = a.professional?.user?.name || 'Profissional'
  const canCancel = a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && new Date(a.startTime) > new Date()
  const isCompleted = a.status === 'COMPLETED'
  const hasReview = !!a.review

  const handleCancel = async () => {
    try {
      await cancel.mutateAsync(a.id)
      setConfirming(false)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao cancelar consulta.')
      setConfirming(false)
    }
  }

  const handleSubmitReview = async () => {
    if (reviewRating < 1) return
    setReviewMsg('')
    try {
      await submitReview.mutateAsync({ appointmentId: a.id, rating: reviewRating, comment: reviewComment || undefined })
      setReviewMsg('Avaliacao enviada!')
      setShowReviewForm(false)
    } catch (err: any) {
      setReviewMsg(err?.response?.data?.message || 'Erro ao enviar avaliacao.')
    }
  }

  return (
    <div className="patient-appointment-card">
      <div className="patient-appointment-header">
        <div>
          <div className="patient-appointment-service">{a.service?.name}</div>
          <div className="patient-appointment-pro">
            <UserCheck size={12} /> {proName}
          </div>
        </div>
        <span className={`badge ${status.cls}`}>{status.label}</span>
      </div>
      <div className="patient-appointment-meta">
        <span><CalendarDays size={13} /> {formatDate(a.startTime)}</span>
        <span><Clock size={13} /> {formatDuration(a.service?.duration || 0)}</span>
      </div>
      {a.notes && <div className="patient-appointment-notes">{a.notes}</div>}

      {/* Review section for completed appointments */}
      {isCompleted && hasReview && (
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>Sua avaliacao:</span>
            <StarRating value={a.review!.rating} readonly />
          </div>
          {a.review!.comment && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0', fontStyle: 'italic' }}>
              "{a.review!.comment}"
            </p>
          )}
        </div>
      )}

      {isCompleted && !hasReview && !showReviewForm && (
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 12 }}
            onClick={() => setShowReviewForm(true)}
          >
            ★ Avaliar atendimento
          </button>
        </div>
      )}

      {isCompleted && !hasReview && showReviewForm && (
        <div style={{
          marginTop: 10, padding: '12px 14px', borderRadius: 8,
          background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>
            Como foi seu atendimento?
          </p>
          <StarRating value={reviewRating} onChange={setReviewRating} />
          <textarea
            className="input-field"
            placeholder="Comentario (opcional)"
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            style={{ marginTop: 8, minHeight: 60, fontSize: 13 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewComment('') }}>
              Cancelar
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmitReview}
              disabled={reviewRating < 1 || submitReview.isPending}
            >
              {submitReview.isPending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {reviewMsg && (
        <p style={{
          marginTop: 6, fontSize: 12, fontWeight: 500,
          color: reviewMsg.includes('Erro') || reviewMsg.includes('erro') ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)',
        }}>
          {reviewMsg}
        </p>
      )}

      {canCancel && !confirming && (
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--color-accent-danger)', fontSize: 12 }}
            onClick={() => setConfirming(true)}
          >
            <X size={12} /> Cancelar consulta
          </button>
        </div>
      )}

      {confirming && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(139,32,32,0.06)', border: '1px solid rgba(139,32,32,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-accent-danger)' }}>
            <AlertTriangle size={14} /> Confirmar cancelamento?
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
            Esta acao nao pode ser desfeita. Deseja cancelar a consulta?
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm"
              style={{ background: 'var(--color-accent-danger)', color: '#fff', flex: 1 }}
              onClick={handleCancel}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Sim, cancelar'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
              Nao
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page principal ────────────────────────────────────────────────────────

export default function MinhasConsultasPage() {
  const { user: authUser, token: authToken, isAuthenticated, signOut } = useAuth()

  // Se o usuário está autenticado como PATIENT via AuthContext (login pelo header),
  // fazemos a ponte: copiamos o token para o patient_token para os hooks existentes funcionarem.
  useEffect(() => {
    if (isAuthenticated && authUser?.role === 'PATIENT' && authToken) {
      localStorage.setItem('patient_token', authToken)
      localStorage.setItem('patient_user', JSON.stringify({
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
      }))
    }
  }, [isAuthenticated, authUser, authToken])

  const [screen, setScreen] = useState<Screen>(() => {
    // Prioridade 1: usuário já logado via AuthContext como PATIENT
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('@Consultorio:user')
      if (stored) {
        try {
          const u = JSON.parse(stored)
          if (u.role === 'PATIENT') return 'dashboard'
        } catch {}
      }
    }
    // Prioridade 2: login próprio do portal de paciente
    const token = localStorage.getItem('patient_token')
    const user  = localStorage.getItem('patient_user')
    return token && user ? 'dashboard' : 'login'
  })

  const handleLogout = () => {
    clearPatient()
    // Se veio do AuthContext, também faz logout global
    if (authUser?.role === 'PATIENT') signOut()
    setScreen('login')
  }

  return (
    <div className="patient-portal-wrapper">
      {screen === 'login' && (
        <LoginScreen
          onSuccess={() => setScreen('dashboard')}
          onRegister={() => setScreen('register')}
        />
      )}
      {screen === 'register' && (
        <RegisterScreen
          onBack={() => setScreen('login')}
          onSuccess={() => setScreen('dashboard')}
        />
      )}
      {screen === 'dashboard' && <PatientDashboard onLogout={handleLogout} />}
    </div>
  )
}
