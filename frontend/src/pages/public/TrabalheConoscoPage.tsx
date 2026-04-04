import { useState } from 'react'
import { ChevronDown, ChevronUp, MapPin, Clock, Briefcase, CheckCircle2, AlertCircle } from 'lucide-react'
import { useActiveJobOpenings, useSubmitCandidacy } from '../../hooks/useJobs'

const regimeColor: Record<string, string> = {
  CLT: 'badge-emerald',
  PJ: 'badge-gold',
  Estágio: 'badge-warning',
}

export default function TrabalheConoscoPage() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    message: '', 
    resumeUrl: '',
    jobOpeningId: '' 
  })
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { data: jobs = [], isLoading } = useActiveJobOpenings()
  const submitCandidacy = useSubmitCandidacy()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!formData.name || !formData.email) {
      setErrorMsg('Por favor, preencha nome e e-mail.')
      return
    }

    try {
      await submitCandidacy.mutateAsync({
        ...formData,
      })
      setSubmitted(true)
    } catch {
      setErrorMsg('Ocorreu um erro ao enviar sua candidatura. Tente novamente mais tarde.')
    }
  }

  if (isLoading) return <div style={{ marginTop: 'var(--navbar-height)', padding: 100, textAlign: 'center' }}>Carregando vagas...</div>

  return (
    <div style={{ marginTop: 'var(--navbar-height)', minHeight: '100vh' }}>
      <div className="container careers-intro">
        <h1 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Trabalhe Conosco</h1>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: 600, marginBottom: 'var(--space-8)', lineHeight: 1.7 }}>
          Faça parte da equipe Clínica Vitalis. Buscamos profissionais apaixonados por cuidar de pessoas, comprometidos com a excelência e que compartilhem dos nossos valores.
        </p>

        {/* Job Listings */}
        <div className="stagger-children" style={{ marginBottom: 'var(--space-12)' }}>
          {jobs.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
              Não há vagas abertas no momento. Você ainda pode enviar seu currículo para nosso banco de talentos abaixo.
            </p>
          ) : jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div
                className="job-card-header"
                onClick={() => setExpanded(expanded === job.id ? null : job.id)}
              >
                <div>
                  <h3>{job.title}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} /> {job.location || 'São Paulo'}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {job.hours || 'Horário comercial'}
                    </span>
                  </div>
                </div>
                <div className="job-badges">
                  <span className="badge badge-gold">{job.area || 'Saúde'}</span>
                  <span className={`badge ${regimeColor[job.regime || 'CLT'] || 'badge-muted'}`}>{job.regime || 'CLT'}</span>
                  {expanded === job.id ? <ChevronUp size={20} color="var(--color-accent-emerald)" /> : <ChevronDown size={20} color="var(--color-accent-emerald)" />}
                </div>
              </div>

              {expanded === job.id && (
                <div className="job-card-body animate-fade-in-up">
                  {job.requirements && (
                    <div className="job-section">
                      <h4>Requisitos</h4>
                      <ul>{job.requirements.split('\n').map((r, j) => <li key={j}>{r}</li>)}</ul>
                    </div>
                  )}
                  {job.responsibilities && (
                    <div className="job-section">
                      <h4>Responsabilidades</h4>
                      <ul>{job.responsibilities.split('\n').map((r, j) => <li key={j}>{r}</li>)}</ul>
                    </div>
                  )}
                  {job.benefits && (
                    <div className="job-section">
                      <h4>Benefícios</h4>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {job.benefits.split('\n').map(b => (
                          <span key={b} className="badge badge-emerald">{b}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16 }}>
                    Vaga publicada em: {new Date(job.createdAt).toLocaleDateString('pt-BR')} 
                    {job.expiresAt && ` · Prazo: ${new Date(job.expiresAt).toLocaleDateString('pt-BR')}`}
                  </p>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ marginTop: 16 }}
                    onClick={() => {
                        setFormData({ ...formData, jobOpeningId: job.id })
                        document.getElementById('candidatura-form')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    Candidatar-se a esta vaga
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Application Form */}
        <div className="application-form" id="candidatura-form">
          {submitted ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <CheckCircle2 size={48} color="var(--color-accent-emerald)" style={{ margin: '0 auto var(--space-4)' }} />
              <h3 style={{ fontSize: 24, marginBottom: 8 }}>Candidatura Enviada!</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Agradecemos o interesse. Nossa equipe de RH analisará seu perfil e entrará em contato se houver compatibilidade.</p>
              <button className="btn btn-secondary btn-lg" style={{ marginTop: 24 }} onClick={() => setSubmitted(false)}>Enviar outra candidatura</button>
            </div>
          ) : (
            <>
              <h3>{formData.jobOpeningId ? 'Candidatar-se à Vaga' : 'Envie sua Candidatura'}</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: 14 }}>
                {formData.jobOpeningId 
                  ? `Você está se candidatando para: ${jobs.find(j => j.id === formData.jobOpeningId)?.title}` 
                  : 'Preencha os campos abaixo e entraremos em contato quando surgir uma oportunidade.'}
              </p>

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Nome Completo <span className="required">*</span></label>
                    <input required className="input-field" placeholder="Seu nome" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">E-mail <span className="required">*</span></label>
                    <input required className="input-field" type="email" placeholder="seu@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Telefone</label>
                    <input className="input-field" placeholder="(11) 99999-9999" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Link para Currículo (Drive/LinkedIn) <span className="required">*</span></label>
                    <input required className="input-field" placeholder="https://..." value={formData.resumeUrl} onChange={e => setFormData({ ...formData, resumeUrl: e.target.value })} />
                  </div>
                </div>
                {!formData.jobOpeningId && (
                    <div className="form-row">
                        <div className="input-group full-span">
                            <label className="input-label">Área de Interesse</label>
                            <select className="input-field" defaultValue="">
                                <option value="" disabled>Selecione...</option>
                                <option>Atendimento</option>
                                <option>Saúde</option>
                                <option>Marketing</option>
                                <option>Administrativo</option>
                            </select>
                        </div>
                    </div>
                )}
                <div className="form-row full">
                  <div className="input-group">
                    <label className="input-label">Mensagem de Apresentação</label>
                    <textarea className="input-field" style={{ minHeight: 100 }} placeholder="Conte um pouco sobre você..." value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
                  </div>
                </div>

                {errorMsg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-accent-danger)', fontSize: 14, marginBottom: 16 }}>
                        <AlertCircle size={16} /> {errorMsg}
                    </div>
                )}

                <button type="submit" className="btn btn-primary btn-lg" disabled={submitCandidacy.isPending}>
                  <Briefcase size={18} />
                  {submitCandidacy.isPending ? 'Enviando...' : 'Enviar Candidatura'}
                </button>
                
                {formData.jobOpeningId && (
                    <button type="button" className="btn btn-ghost" style={{ marginLeft: 12 }} onClick={() => setFormData({ ...formData, jobOpeningId: '' })}>
                        Limpar seleção de vaga
                    </button>
                )}
              </form>
            </>
          )}
        </div>

        {/* Talent Pool CTA */}
        {!formData.jobOpeningId && !submitted && (
            <div className="talent-pool-section">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-3)' }}>Banco de Talentos</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', maxWidth: 500, margin: '0 auto var(--space-6)' }}>
                    Não encontrou uma vaga ideal? Envie seu currículo acima mesmo sem selecionar uma vaga específica, e entraremos em contato quando surgir uma oportunidade.
                </p>
            </div>
        )}
      </div>
    </div>
  )
}
