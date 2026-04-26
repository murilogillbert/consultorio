import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, GraduationCap, Languages, Globe } from 'lucide-react'
import { useProfessionals } from '../../hooks/useProfessionals'

const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function ProfissionaisPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [filter, setFilter] = useState('Todos')
  const { data: professionals = [], isLoading } = useProfessionals()

  // Filtra profissionais sem especialidade do filtro para evitar pílulas vazias.
  const allSpecs = professionals
    .map(p => (p.specialty || '').trim())
    .filter(s => s.length > 0)
  const specs = ['Todos', ...Array.from(new Set(allSpecs)).sort()]

  const filtered = filter === 'Todos'
    ? professionals
    : professionals.filter(p => (p.specialty || '').trim() === filter)

  return (
    <div style={{ marginTop: 'var(--navbar-height)', minHeight: '100vh' }}>
      <div className="container" style={{ padding: 'var(--space-12) var(--space-8)' }}>
        <h1 className="section-title" style={{ marginBottom: 'var(--space-6)' }}>Nossa Equipe</h1>

        <div className="pill-tabs" style={{ marginBottom: 'var(--space-8)' }}>
          {specs.map(s => (
            <button key={s} className={`pill-tab${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
              {s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-8) 0', textAlign: 'center' }}>Carregando profissionais...</p>
        ) : (
        <div className="professionals-grid stagger-children">
          {filtered.map((prof, i) => {
            const isExpanded = expandedIndex === i
            const name = prof.user?.name || 'Profissional'
            const initials = name.split(' ').filter((_, j, arr) => j === 0 || j === arr.length - 1).map(n => n[0]).join('')
            const languagesList = prof.languages ? prof.languages.split(',').map(l => l.trim()) : []
            const profServices = prof.services || []
            const profEducations = prof.educations || []
            const schedules = prof.schedules || []
            const availability = [1, 2, 3, 4, 5, 6, 0].map(day => schedules.some(s => s.dayOfWeek === day))
            return (
              <div key={prof.id} className="professional-profile-card">
                <div className="professional-photo-area">
                  <div className="avatar avatar-xl avatar-gold-ring avatar-placeholder">
                    {prof.user?.avatarUrl ? (
                      <img src={prof.user.avatarUrl} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : initials}
                  </div>
                </div>
                <div className="professional-profile-body">
                  <h3>{name}</h3>
                  {(prof.crm || prof.councilType) && (
                    <p className="crm">{prof.councilType} {prof.crm}</p>
                  )}

                  {(prof.specialty || '').trim() && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                      <span className="badge badge-emerald">{prof.specialty}</span>
                    </div>
                  )}

                  {prof.bio && prof.bio.trim() && (
                    <p style={{
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: 12,
                      display: '-webkit-box',
                      WebkitLineClamp: isExpanded ? undefined : 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {prof.bio}
                    </p>
                  )}

                  {/* Availability dots */}
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6 }}>Disponibilidade semanal</p>
                    <div className="availability-dots">
                      {availability.map((avail, j) => (
                        <div key={j} className={`availability-dot ${avail ? 'available' : 'unavailable'}`}>
                          {days[j]}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expandable education */}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setExpandedIndex(isExpanded ? null : i)}
                    style={{ marginBottom: 12, padding: 0 }}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span style={{ marginLeft: 4 }}>Formação e Serviços</span>
                  </button>

                  {isExpanded && (
                    <div className="animate-fade-in-up" style={{ marginBottom: 16 }}>
                      {profEducations.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent-emerald)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <GraduationCap size={14} /> Formação
                        </h4>
                        {profEducations.map((edu) => (
                          <p key={edu.id} style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '2px 0' }}>{edu.degree} em {edu.fieldOfStudy} — {edu.institution} ({edu.year})</p>
                        ))}
                      </div>
                      )}

                      {languagesList.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent-emerald)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Languages size={14} /> Idiomas
                        </h4>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {languagesList.map(l => (
                            <span key={l} className="badge badge-gold">{l}</span>
                          ))}
                        </div>
                      </div>
                      )}

                      {profServices.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent-emerald)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Globe size={14} /> Serviços
                        </h4>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {profServices.map(s => (
                            <Link key={s.service.id} to="/servicos" className="badge badge-muted" style={{ cursor: 'pointer' }}>{s.service.name}</Link>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  )}

                  <Link to="/agendar" className="btn btn-primary btn-full">
                    Agendar Consulta
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}
