import { useState } from 'react'
import { ChevronDown, ChevronUp, MapPin, Clock, Briefcase, Upload } from 'lucide-react'

const jobs = [
  {
    title: 'Recepcionista',
    area: 'Atendimento',
    regime: 'CLT',
    location: 'São Paulo — Jardim Paulista',
    hours: 'Segunda a Sexta, 08h às 17h',
    requirements: ['Ensino médio completo', 'Experiência com atendimento ao público', 'Conhecimento em informática básica', 'Boa comunicação verbal e escrita'],
    desirable: ['Experiência na área da saúde', 'Conhecimento em sistemas de agendamento'],
    responsibilities: ['Recepcionar pacientes com empatia e cordialidade', 'Realizar agendamentos e confirmações', 'Gerenciar documentos e prontuários', 'Apoiar a equipe administrativa'],
    benefits: ['Plano de saúde', 'Vale-refeição', 'Vale-transporte', 'Seguro de vida'],
    deadline: '15/04/2026',
  },
  {
    title: 'Enfermeiro(a)',
    area: 'Saúde',
    regime: 'CLT',
    location: 'São Paulo — Jardim Paulista',
    hours: 'Escala 12x36',
    requirements: ['Graduação em Enfermagem', 'COREN ativo', 'Experiência mínima de 2 anos', 'BLS/ACLS atualizado'],
    desirable: ['Pós-graduação em área clínica', 'Experiência em clínica ambulatorial'],
    responsibilities: ['Realizar procedimentos de enfermagem', 'Auxiliar nos procedimentos médicos', 'Monitorar sinais vitais dos pacientes', 'Administrar medicações conforme prescrição'],
    benefits: ['Plano de saúde', 'Vale-refeição', 'Vale-transporte', 'Adicional de insalubridade'],
    deadline: '20/04/2026',
  },
  {
    title: 'Estagiário(a) de Marketing',
    area: 'Marketing',
    regime: 'Estágio',
    location: 'São Paulo — Jardim Paulista',
    hours: 'Segunda a Sexta, 09h às 15h',
    requirements: ['Cursando Marketing, Publicidade ou áreas correlatas', 'Conhecimento em redes sociais', 'Familiaridade com Canva ou ferramentas similares'],
    desirable: ['Experiência prévia com marketing digital', 'Conhecimentos em SEO'],
    responsibilities: ['Auxiliar na produção de conteúdo', 'Gerenciar redes sociais da clínica', 'Apoiar na criação de campanhas', 'Produzir relatórios de métricas'],
    benefits: ['Bolsa-auxílio', 'Vale-transporte', 'Ambiente de aprendizado'],
    deadline: '30/04/2026',
  },
]

const regimeColor: Record<string, string> = {
  CLT: 'badge-emerald',
  PJ: 'badge-gold',
  Estágio: 'badge-warning',
}

export default function TrabalheConoscoPage() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' })

  return (
    <div style={{ marginTop: 'var(--navbar-height)', minHeight: '100vh' }}>
      <div className="container careers-intro">
        <h1 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Trabalhe Conosco</h1>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: 600, marginBottom: 'var(--space-8)', lineHeight: 1.7 }}>
          Faça parte da equipe Clínica Vitalis. Buscamos profissionais apaixonados por cuidar de pessoas, comprometidos com a excelência e que compartilhem dos nossos valores.
        </p>

        {/* Job Listings */}
        <div className="stagger-children">
          {jobs.map((job, i) => (
            <div key={i} className="job-card">
              <div
                className="job-card-header"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div>
                  <h3>{job.title}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} /> {job.location}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {job.hours}
                    </span>
                  </div>
                </div>
                <div className="job-badges">
                  <span className="badge badge-gold">{job.area}</span>
                  <span className={`badge ${regimeColor[job.regime]}`}>{job.regime}</span>
                  {expanded === i ? <ChevronUp size={20} color="var(--color-accent-emerald)" /> : <ChevronDown size={20} color="var(--color-accent-emerald)" />}
                </div>
              </div>

              {expanded === i && (
                <div className="job-card-body animate-fade-in-up">
                  <div className="job-section">
                    <h4>Requisitos Obrigatórios</h4>
                    <ul>{job.requirements.map((r, j) => <li key={j}>{r}</li>)}</ul>
                  </div>
                  <div className="job-section">
                    <h4>Requisitos Desejáveis</h4>
                    <ul>{job.desirable.map((r, j) => <li key={j}>{r}</li>)}</ul>
                  </div>
                  <div className="job-section">
                    <h4>Responsabilidades</h4>
                    <ul>{job.responsibilities.map((r, j) => <li key={j}>{r}</li>)}</ul>
                  </div>
                  <div className="job-section">
                    <h4>Benefícios</h4>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {job.benefits.map(b => (
                        <span key={b} className="badge badge-emerald">{b}</span>
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16 }}>
                    Prazo para candidatura: {job.deadline}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Application Form */}
        <div className="application-form">
          <h3>Envie sua Candidatura</h3>
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Nome Completo <span className="required">*</span></label>
              <input className="input-field" placeholder="Seu nome" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">E-mail <span className="required">*</span></label>
              <input className="input-field" type="email" placeholder="seu@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Telefone <span className="required">*</span></label>
              <input className="input-field" placeholder="(11) 99999-9999" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Área de Interesse</label>
              <select className="input-field">
                <option>Selecione...</option>
                <option>Atendimento</option>
                <option>Saúde</option>
                <option>Marketing</option>
                <option>Administrativo</option>
              </select>
            </div>
          </div>
          <div className="form-row full">
            <div className="input-group">
              <label className="input-label">Mensagem de Apresentação</label>
              <textarea className="input-field" placeholder="Conte um pouco sobre você..." value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
            </div>
          </div>
          <div className="file-upload-area" style={{ marginBottom: 'var(--space-6)' }}>
            <Upload size={32} />
            <p>Arraste seu currículo aqui ou <strong style={{ color: 'var(--color-accent-emerald)' }}>clique para selecionar</strong></p>
            <span>PDF, DOC ou DOCX — máx. 5MB</span>
          </div>
          <button className="btn btn-primary btn-lg">
            <Briefcase size={18} />
            Enviar Candidatura
          </button>
        </div>

        {/* Talent Pool */}
        <div className="talent-pool-section">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-3)' }}>Banco de Talentos</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', maxWidth: 500, margin: '0 auto var(--space-6)' }}>
            Não encontrou uma vaga ideal? Cadastre seu currículo em nosso banco de talentos e entraremos em contato quando surgir uma oportunidade.
          </p>
          <button className="btn btn-secondary btn-lg">
            <Upload size={18} />
            Cadastrar Currículo
          </button>
        </div>
      </div>
    </div>
  )
}
