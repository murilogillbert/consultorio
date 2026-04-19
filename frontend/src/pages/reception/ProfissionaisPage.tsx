import { useState } from 'react'
import { Search, X, Calendar } from 'lucide-react'
import { useProfessionals, type Professional } from '../../hooks/useProfessionals'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const statusLabels: Record<string, string> = {
  available: 'Disponível',
  busy: 'Em Atendimento',
  away: 'Ausente',
}

function ScheduleModal({ prof, onClose }: { prof: Professional; onClose: () => void }) {
  const name = prof.user?.name || 'Profissional'
  const schedules = prof.schedules || []

  // Agrupa horários por dia da semana
  const byDay: Record<number, { startTime: string; endTime: string }[]> = {}
  schedules.forEach(s => {
    if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = []
    byDay[s.dayOfWeek].push({ startTime: s.startTime, endTime: s.endTime })
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar size={20} color="var(--color-accent-emerald)" />
            <div>
              <h3 style={{ marginBottom: 2 }}>{name}</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>{prof.specialty}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Horários de atendimento configurados:
          </p>
          {schedules.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px 0', fontStyle: 'italic' }}>
              Nenhum horário cadastrado.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const slots = byDay[day]
                if (!slots || slots.length === 0) return null
                return (
                  <div key={day} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-subtle)',
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 14, minWidth: 40 }}>{DAY_NAMES[day]}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                      {slots.map((s, i) => (
                        <span key={i} className="time-pill" style={{ fontSize: 13 }}>
                          {s.startTime} – {s.endTime}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

export default function ProfissionaisPage() {
  const [filter, setFilter] = useState('')
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null)
  const { data: professionals = [], isLoading } = useProfessionals()

  const filtered = professionals.filter(p => {
    const name = (p.user?.name || '').toLowerCase()
    const specialty = (p.specialty || '').toLowerCase()
    return name.includes(filter.toLowerCase()) || specialty.includes(filter.toLowerCase())
  })

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-input-wrapper profissionais-search-wrapper" style={{ maxWidth: 280 }}>
          <Search size={16} />
          <input
            className="input-field"
            placeholder="Buscar profissional..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ padding: '48px 16px' }}>
          <p>Carregando profissionais...</p>
        </div>
      ) : (
        <div className="availability-grid stagger-children">
          {filtered.map(prof => {
            const name = prof.user?.name || 'Sem nome'
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
            const status = prof.active ? 'available' : 'away'
            const schedules = prof.schedules || []

            // Horários únicos para exibição (dias da semana que tem agenda)
            const workDays = [...new Set(schedules.map(s => s.dayOfWeek))].sort()

            return (
              <div key={prof.id} className="availability-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedProf(prof)}>
                {prof.user?.avatarUrl ? (
                  <img src={prof.user.avatarUrl} alt={name} className="avatar avatar-lg avatar-gold-ring" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="avatar avatar-lg avatar-gold-ring avatar-placeholder">{initials}</div>
                )}
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-ui)', fontWeight: 700 }}>{name}</h3>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{prof.specialty}</span>
                <div className="status-badge">
                  <div className={`status-dot ${status}`} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: status === 'available' ? 'var(--color-accent-emerald)' : 'var(--color-text-muted)' }}>
                    {statusLabels[status] || 'Ausente'}
                  </span>
                </div>
                {workDays.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                    {workDays.map(d => (
                      <span key={d} className="time-pill" style={{ fontSize: 11 }}>{DAY_NAMES[d]}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sem horários cadastrados</span>
                )}
                <button
                  className="btn btn-primary btn-sm btn-full"
                  style={{ marginTop: 'auto' }}
                  onClick={e => { e.stopPropagation(); setSelectedProf(prof) }}
                >
                  Ver Agenda
                </button>
              </div>
            )
          })}
        </div>
      )}

      {selectedProf && (
        <ScheduleModal prof={selectedProf} onClose={() => setSelectedProf(null)} />
      )}
    </div>
  )
}
