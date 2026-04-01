import { useState } from 'react'
import { Search } from 'lucide-react'
import { useProfessionals } from '../../hooks/useProfessionals'

const statusLabels: Record<string, string> = {
  available: 'Disponível',
  busy: 'Em Atendimento',
  away: 'Ausente',
}

export default function ProfissionaisPage() {
  const [filter, setFilter] = useState('')
  const [period, setPeriod] = useState('all')
  const { data: professionals = [], isLoading } = useProfessionals()

  const filtered = professionals.filter(p => {
    const name = (p.user?.name || '').toLowerCase()
    const specialty = (p.specialty || '').toLowerCase()
    return name.includes(filter.toLowerCase()) || specialty.includes(filter.toLowerCase())
  })

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
          <Search size={16} />
          <input className="input-field" placeholder="Buscar profissional..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <input type="date" className="input-field" style={{ width: 'auto' }} defaultValue="2026-03-28" />
        <div className="pill-tabs">
          {[{ v: 'all', l: 'Todos' }, { v: 'morning', l: 'Manhã' }, { v: 'afternoon', l: 'Tarde' }, { v: 'evening', l: 'Noite' }].map(p => (
            <button key={p.v} className={`pill-tab${period === p.v ? ' active' : ''}`} onClick={() => setPeriod(p.v)}>{p.l}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ padding: '48px 16px' }}>
          <p>Carregando profissionais...</p>
        </div>
      ) : (
        <div className="availability-grid stagger-children">
          {filtered.map((prof) => {
            const name = prof.user?.name || 'Sem nome'
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
            const status = prof.active ? 'available' : 'away'
            const scheduleSlots = (prof.schedules || []).map(s => s.startTime?.slice(0, 5)).filter(Boolean)
            return (
              <div key={prof.id} className="availability-card">
                {prof.user?.avatarUrl ? (
                  <img src={prof.user.avatarUrl} alt={name} className="avatar avatar-lg avatar-gold-ring" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="avatar avatar-lg avatar-gold-ring avatar-placeholder">
                    {initials}
                  </div>
                )}
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-ui)', fontWeight: 700 }}>{name}</h3>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{prof.specialty}</span>
                <div className="status-badge">
                  <div className={`status-dot ${status}`} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: status === 'available' ? 'var(--color-accent-emerald)' : 'var(--color-text-muted)' }}>
                    {statusLabels[status] || 'Ausente'}
                  </span>
                </div>
                {scheduleSlots.length > 0 ? (
                  <div className="time-pills">
                    {scheduleSlots.map(s => (
                      <span key={s} className="time-pill">{s}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sem horários disponíveis</span>
                )}
                <button className="btn btn-primary btn-sm btn-full" style={{ marginTop: 'auto' }} disabled={scheduleSlots.length === 0}>
                  Ver Agenda
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
