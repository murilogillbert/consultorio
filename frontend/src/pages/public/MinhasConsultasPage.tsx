import { useState, useEffect, useRef } from 'react'
import {
  Mail, ArrowRight, Loader2, CalendarDays, Clock, UserCheck,
  MessageCircle, Send, CheckCircle, XCircle, RefreshCw, LogOut, ShieldCheck
} from 'lucide-react'
import {
  useRequestOtp, useVerifyOtp,
  usePatientAppointments, usePatientConversation, useSendPatientMessage,
  getPatientUser, clearPatient, type PatientAppointment
} from '../../hooks/usePatientPortal'

type Screen = 'email' | 'otp' | 'dashboard'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: 'Agendada', cls: 'badge-gold' },
  CONFIRMED: { label: 'Confirmada', cls: 'badge-emerald' },
  IN_PROGRESS: { label: 'Em andamento', cls: 'badge-brand' },
  COMPLETED: { label: 'Concluída', cls: 'badge-emerald' },
  CANCELLED: { label: 'Cancelada', cls: 'badge-danger' },
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

// ─── Tela: Login com email ─────────────────────────────────────────────────

function EmailScreen({ onNext }: { onNext: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const requestOtp = useRequestOtp()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    await requestOtp.mutateAsync(email.trim())
    onNext(email.trim())
  }

  return (
    <div className="patient-auth-card animate-fade-in">
      <div className="patient-auth-icon"><Mail size={32} /></div>
      <h2>Minhas Consultas</h2>
      <p>Digite seu email cadastrado e enviaremos um código de acesso.</p>
      <form onSubmit={handleSubmit} className="patient-auth-form">
        <div className="input-group">
          <label className="input-label">Email</label>
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
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={requestOtp.isPending}
        >
          {requestOtp.isPending
            ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
            : <><Send size={16} /> Enviar código por email</>}
        </button>
      </form>
      {requestOtp.isSuccess && (
        <p className="patient-auth-hint success">
          <CheckCircle size={14} /> Código enviado! Verifique sua caixa de entrada.
        </p>
      )}
    </div>
  )
}

// ─── Tela: OTP ─────────────────────────────────────────────────────────────

function OtpScreen({ email, onSuccess, onBack }: { email: string; onSuccess: () => void; onBack: () => void }) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const verifyOtp = useVerifyOtp()
  const requestOtp = useRequestOtp()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await verifyOtp.mutateAsync({ email, otp })
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Código inválido. Tente novamente.')
    }
  }

  const handleResend = async () => {
    setOtp(''); setError('')
    await requestOtp.mutateAsync(email)
  }

  return (
    <div className="patient-auth-card animate-fade-in">
      <div className="patient-auth-icon"><ShieldCheck size={32} /></div>
      <h2>Código de acesso</h2>
      <p>Enviamos um código de 6 dígitos para <strong>{email}</strong></p>
      <form onSubmit={handleSubmit} className="patient-auth-form">
        <div className="input-group">
          <label className="input-label">Código</label>
          <input
            className="input-field patient-otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            autoFocus
          />
        </div>
        {error && <p className="patient-auth-hint error"><XCircle size={14} /> {error}</p>}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={verifyOtp.isPending || otp.length < 6}
        >
          {verifyOtp.isPending
            ? <><Loader2 size={16} className="animate-spin" /> Verificando...</>
            : <><ArrowRight size={16} /> Entrar</>}
        </button>
      </form>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Voltar</button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleResend}
          disabled={requestOtp.isPending}
        >
          <RefreshCw size={12} /> Reenviar código
        </button>
      </div>
    </div>
  )
}

// ─── Tela: Dashboard do paciente ───────────────────────────────────────────

function PatientDashboard({ onLogout }: { onLogout: () => void }) {
  const user = getPatientUser()
  const { data: appointments = [], isLoading: loadingApps } = usePatientAppointments()
  const { data: convData, isLoading: loadingConv } = usePatientConversation()
  const sendMsg = useSendPatientMessage()
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'consultas' | 'chat'>('consultas')
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
  const past = appointments.filter(a => new Date(a.startTime) < new Date() || a.status === 'CANCELLED')

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
            {!loadingConv && !convData?.conversation && (
              <div className="patient-empty">
                <MessageCircle size={36} color="var(--color-text-muted)" />
                <p>Agende uma consulta para iniciar o chat com a clínica.</p>
              </div>
            )}
            {convData?.messages.map(msg => {
              const isOut = msg.direction === 'IN' // paciente enviou
              return (
                <div key={msg.id} style={{ alignSelf: isOut ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
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
              disabled={!convData?.conversation}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--color-text-primary)' }}
            />
            <button
              className="btn btn-primary btn-icon"
              onClick={handleSend}
              disabled={!message.trim() || sendMsg.isPending || !convData?.conversation}
            >
              {sendMsg.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AppointmentCard({ appointment: a }: { appointment: PatientAppointment }) {
  const status = STATUS_LABEL[a.status] || { label: a.status, cls: 'badge-gold' }
  const proName = a.professional?.user?.name || 'Profissional'
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
    </div>
  )
}

// ─── Page principal ────────────────────────────────────────────────────────

export default function MinhasConsultasPage() {
  const [screen, setScreen] = useState<Screen>(() => {
    const token = localStorage.getItem('patient_token')
    const user = localStorage.getItem('patient_user')
    return token && user ? 'dashboard' : 'email'
  })
  const [email, setEmail] = useState('')

  const handleEmailNext = (e: string) => {
    setEmail(e)
    setScreen('otp')
  }

  const handleOtpSuccess = () => setScreen('dashboard')

  const handleLogout = () => {
    clearPatient()
    setScreen('email')
    setEmail('')
  }

  return (
    <div className="patient-portal-wrapper">
      {screen === 'email' && <EmailScreen onNext={handleEmailNext} />}
      {screen === 'otp' && (
        <OtpScreen
          email={email}
          onSuccess={handleOtpSuccess}
          onBack={() => setScreen('email')}
        />
      )}
      {screen === 'dashboard' && <PatientDashboard onLogout={handleLogout} />}
    </div>
  )
}
