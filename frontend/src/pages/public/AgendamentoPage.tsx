import { useState, useRef, useEffect } from 'react'
import { Check, ArrowLeft, ArrowRight, Calendar, Clock, User, Stethoscope, Eye, EyeOff, LogIn } from 'lucide-react'
import { useServices } from '../../hooks/useServices'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useAvailableSlots } from '../../hooks/useSchedules'
import { usePublicBooking } from '../../hooks/usePublicBooking'
import { getPatientToken, getPatientUser, usePatientLogin } from '../../hooks/usePatientPortal'

const steps = ['Serviço', 'Profissional', 'Data e Hora', 'Seus Dados', 'Confirmação']

export default function AgendamentoPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    service: '', serviceId: '', professional: '', professionalId: '', date: '', time: '', startTime: '', endTime: '', name: '', cpf: '', phone: '', email: '', password: '', confirmPassword: '', notes: ''
  })
  const [showPass, setShowPass]   = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [successMsg, setSuccessMsg]         = useState('')

  // Patient session detection
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const patientLogin = usePatientLogin()

  // Check if patient is already logged in and pre-fill data
  useEffect(() => {
    const token = getPatientToken()
    const user = getPatientUser()
    if (token && user) {
      setIsLoggedIn(true)
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        password: 'already-set',
        confirmPassword: 'already-set',
      }))
    }
  }, [])

  const dateInputRef = useRef<HTMLInputElement>(null)

  const { data: services = [], isLoading: loadingServices } = useServices()
  const { data: allProfessionals = [], isLoading: loadingProfessionals } = useProfessionals()

  // Filtra profissionais que têm o serviço selecionado vinculado.
  // Se nenhum estiver vinculado (serviço sem restrição), mostra todos.
  const professionals = formData.serviceId
    ? allProfessionals.filter(p =>
        !p.serviceIds?.length || p.serviceIds.includes(formData.serviceId)
      )
    : allProfessionals

  // Abre o picker de data automaticamente ao entrar no passo 2
  useEffect(() => {
    if (currentStep === 2) {
      const timer = setTimeout(() => {
        try { dateInputRef.current?.showPicker?.() } catch {}
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [currentStep])
  const { data: availableSlots = [], isLoading: loadingSlots } = useAvailableSlots(
    formData.professionalId || undefined,
    formData.date || undefined,
    formData.serviceId || undefined
  )
  const bookingMutation = usePublicBooking()

  const handleLogin = async () => {
    setLoginError('')
    try {
      const res = await patientLogin.mutateAsync({ email: loginEmail, password: loginPassword })
      setIsLoggedIn(true)
      setShowLoginForm(false)
      setFormData(prev => ({
        ...prev,
        name: res.user.name || prev.name,
        email: res.user.email || prev.email,
        password: 'already-set',
        confirmPassword: 'already-set',
      }))
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || 'E-mail ou senha incorretos.')
    }
  }

  const canAdvance = () => {
    if (currentStep === 0) return formData.serviceId !== ''
    if (currentStep === 1) return formData.professionalId !== ''
    if (currentStep === 2) return formData.date !== '' && formData.time !== ''
    if (currentStep === 3) {
      if (isLoggedIn) return formData.name !== '' && formData.email !== ''
      return (
        formData.name !== '' &&
        formData.email !== '' &&
        formData.password.length >= 6 &&
        formData.password === formData.confirmPassword
      )
    }
    return true
  }

  return (
    <div className="booking-page">
      <div className="container">
        <h1 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          Agendar Consulta
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)' }}>
          Complete os passos abaixo para realizar seu agendamento
        </p>

        {/* Progress */}
        <div className="booking-progress">
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className={`booking-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}>
                <div className="booking-step-number">
                  {i < currentStep ? <Check size={14} /> : i + 1}
                </div>
                <span className="booking-step-label">{step}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`booking-step-divider ${i < currentStep ? 'completed' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="booking-content animate-fade-in-up" key={currentStep}>
          {/* Step 0: Select Service */}
          {currentStep === 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-6)' }}>
                <Stethoscope size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                Selecione o Serviço
              </h2>
              {loadingServices ? (
                <p style={{ color: 'var(--color-text-muted)' }}>Carregando serviços...</p>
              ) : services.filter(s => s.onlineBooking).map(s => (
                <label key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: formData.serviceId === s.id ? 'rgba(45,106,79,0.08)' : 'transparent',
                  border: `1px solid ${formData.serviceId === s.id ? 'var(--color-accent-emerald)' : 'var(--color-border-default)'}`,
                  borderRadius: 'var(--radius-sm)', marginBottom: 8, cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}>
                  <input type="radio" name="service" checked={formData.serviceId === s.id}
                    onChange={() => setFormData({ ...formData, service: s.name, serviceId: s.id, professional: '', professionalId: '' })}
                    style={{ accentColor: 'var(--color-accent-emerald)' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{s.duration} min — R$ {(s.price / 100).toFixed(2).replace('.', ',')}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Step 1: Select Professional */}
          {currentStep === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-6)' }}>
                <User size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                Escolha o Profissional
              </h2>
              {loadingProfessionals ? (
                <p style={{ color: 'var(--color-text-muted)' }}>Carregando profissionais...</p>
              ) : professionals.map(p => {
                const name = p.user?.name || 'Profissional'
                const initials = name.split(' ').filter((_, j, arr) => j === 0 || j === arr.length - 1).map(n => n[0]).join('')
                return (
                  <label key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: formData.professionalId === p.id ? 'rgba(45,106,79,0.08)' : 'transparent',
                    border: `1px solid ${formData.professionalId === p.id ? 'var(--color-accent-emerald)' : 'var(--color-border-default)'}`,
                    borderRadius: 'var(--radius-sm)', marginBottom: 8, cursor: 'pointer'
                  }}>
                    <input type="radio" name="prof" checked={formData.professionalId === p.id}
                      onChange={() => setFormData({ ...formData, professional: name, professionalId: p.id })}
                      style={{ accentColor: 'var(--color-accent-emerald)' }} />
                    <div className="avatar avatar-sm avatar-placeholder">{initials}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{name}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{p.specialty}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* Step 2: Date and Time */}
          {currentStep === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-6)' }}>
                <Calendar size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                Data e Horário
              </h2>
              <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="input-label">Data <span className="required">*</span></label>
                <input
                  ref={dateInputRef}
                  type="date"
                  className="input-field"
                  value={formData.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Horários disponíveis
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {loadingSlots ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>Carregando horários...</p>
                ) : !formData.date ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>Selecione uma data para ver os horários disponíveis</p>
                ) : availableSlots.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>Nenhum horário disponível nesta data</p>
                ) : [...availableSlots].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                  <button key={slot.startTime} className={`pill-tab${formData.time === slot.startTime ? ' active' : ''}`}
                    onClick={() => setFormData({ ...formData, time: slot.startTime, startTime: `${formData.date}T${slot.startTime}:00`, endTime: `${formData.date}T${slot.endTime}:00` })}>
                    {slot.startTime}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Patient Data */}
          {currentStep === 3 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-4)' }}>
                Seus Dados
              </h2>

              {isLoggedIn ? (
                <>
                  <div style={{
                    padding: 'var(--space-4)', marginBottom: 'var(--space-6)',
                    background: 'rgba(45,106,79,0.06)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-accent-emerald)',
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  }}>
                    <Check size={18} color="var(--color-accent-emerald)" />
                    <span style={{ fontSize: 'var(--text-body)', color: 'var(--color-accent-emerald)', fontWeight: 500 }}>
                      Logado como <strong>{formData.name}</strong> ({formData.email})
                    </span>
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label className="input-label">Nome Completo <span className="required">*</span></label>
                      <input className="input-field" value={formData.name} readOnly
                        style={{ background: 'var(--color-bg-secondary)', cursor: 'default' }} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">E-mail <span className="required">*</span></label>
                      <input className="input-field" value={formData.email} readOnly
                        style={{ background: 'var(--color-bg-secondary)', cursor: 'default' }} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Login prompt */}
                  {!showLoginForm ? (
                    <div style={{
                      padding: 'var(--space-4)', marginBottom: 'var(--space-6)',
                      background: 'rgba(201,168,76,0.06)', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-accent-gold)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: 'var(--space-3)',
                    }}>
                      <span style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)' }}>
                        Ja possui conta? Faca login para preencher automaticamente.
                      </span>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowLoginForm(true)}>
                        <LogIn size={14} /> Fazer Login
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      padding: 'var(--space-5)', marginBottom: 'var(--space-6)',
                      background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-default)',
                    }}>
                      <h4 style={{ fontSize: 'var(--text-ui)', fontWeight: 500, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <LogIn size={16} /> Entrar na sua conta
                      </h4>
                      <div className="form-row">
                        <div className="input-group">
                          <label className="input-label">E-mail</label>
                          <input className="input-field" type="email" placeholder="seu@email.com"
                            value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                        </div>
                        <div className="input-group">
                          <label className="input-label">Senha</label>
                          <input className="input-field" type="password" placeholder="Sua senha"
                            value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                        </div>
                      </div>
                      {loginError && (
                        <p style={{ color: 'var(--color-accent-danger)', fontSize: 13, marginBottom: 'var(--space-3)' }}>{loginError}</p>
                      )}
                      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setShowLoginForm(false); setLoginError('') }}>Cancelar</button>
                        <button className="btn btn-primary btn-sm" onClick={handleLogin} disabled={patientLogin.isPending || !loginEmail || !loginPassword}>
                          {patientLogin.isPending ? 'Entrando...' : 'Entrar'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="input-group">
                      <label className="input-label">Nome Completo <span className="required">*</span></label>
                      <input className="input-field" placeholder="Seu nome" value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">CPF</label>
                      <input className="input-field" placeholder="000.000.000-00" value={formData.cpf}
                        onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label className="input-label">E-mail <span className="required">*</span></label>
                      <input className="input-field" type="email" placeholder="seu@email.com" value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Telefone</label>
                      <input className="input-field" placeholder="(11) 99999-9999" value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label className="input-label">Senha de acesso <span className="required">*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input className="input-field" type={showPass ? 'text' : 'password'}
                          placeholder="Minimo 6 caracteres" value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          style={{ paddingRight: 40 }} />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>
                        Usada para acessar "Minhas Consultas" e acompanhar seu historico.
                      </span>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Confirmar senha <span className="required">*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input className="input-field" type={showConf ? 'text' : 'password'}
                          placeholder="Repita a senha" value={formData.confirmPassword}
                          onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                          style={{ paddingRight: 40 }} />
                        <button type="button" onClick={() => setShowConf(v => !v)}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
                          {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <span style={{ fontSize: 12, color: 'var(--color-accent-danger)', marginTop: 4, display: 'block' }}>
                          As senhas nao coincidem.
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="form-row full">
                <div className="input-group">
                  <label className="input-label">Observacoes</label>
                  <textarea className="input-field" placeholder="Informacoes adicionais..." value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-full)', background: 'rgba(45,106,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
                <Check size={32} color="var(--color-accent-emerald)" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-4)' }}>
                Confirme seu Agendamento
              </h2>
              <div style={{ textAlign: 'left', background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Serviço</span><p style={{ fontWeight: 500 }}>{formData.service}</p></div>
                  <div><span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Profissional</span><p style={{ fontWeight: 500 }}>{formData.professional}</p></div>
                  <div><span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Data</span><p style={{ fontWeight: 500 }}>{formData.date}</p></div>
                  <div><span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Horário</span><p style={{ fontWeight: 500 }}>{formData.time}</p></div>
                  <div><span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Paciente</span><p style={{ fontWeight: 500 }}>{formData.name}</p></div>
                  <div><span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Telefone</span><p style={{ fontWeight: 500 }}>{formData.phone}</p></div>
                </div>
              </div>
              {bookingSuccess ? (
                <div>
                  <div style={{ color: 'var(--color-accent-emerald)', fontWeight: 600, fontSize: 'var(--text-lg)', marginBottom: 12 }}>
                    ✓ Agendamento realizado com sucesso!
                  </div>
                  {successMsg && (
                    <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                      {successMsg}
                    </p>
                  )}
                  <a href="/minhas-consultas" className="btn btn-primary btn-sm">
                    Ver minhas consultas
                  </a>
                </div>
              ) : (
                <>
                  <button className="btn btn-primary btn-lg" disabled={bookingMutation.isPending}
                    onClick={() => {
                      bookingMutation.mutate({
                        name: formData.name,
                        email: formData.email,
                        password: isLoggedIn ? undefined : formData.password,
                        cpf: formData.cpf,
                        phone: formData.phone,
                        serviceId: formData.serviceId,
                        professionalId: formData.professionalId,
                        startTime: formData.startTime,
                        endTime: formData.endTime,
                        notes: formData.notes
                      }, {
                        onSuccess: (data: any) => {
                          setBookingSuccess(true)
                          setSuccessMsg(data?.message || '')
                        },
                      })
                    }}>
                    <Check size={18} />
                    {bookingMutation.isPending ? 'Agendando...' : 'Confirmar Agendamento'}
                  </button>
                  {bookingMutation.isError && (
                    <p style={{ color: 'var(--color-accent-danger)', marginTop: 'var(--space-4)', fontSize: 14 }}>
                      {(bookingMutation.error as any)?.response?.data?.message || 'Erro ao realizar agendamento. Tente novamente.'}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation */}
          {currentStep < 4 && (
            <div className="booking-actions">
              <button className="btn btn-secondary" disabled={currentStep === 0}
                onClick={() => setCurrentStep(prev => prev - 1)}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <button className="btn btn-primary" disabled={!canAdvance()}
                onClick={() => setCurrentStep(prev => prev + 1)}>
                Próximo <ArrowRight size={16} />
              </button>
            </div>
          )}
          {currentStep === 4 && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
              <button className="btn btn-ghost" onClick={() => setCurrentStep(0)}>
                <ArrowLeft size={14} /> Voltar ao início
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
