import { useState } from 'react'
import { useMovementData } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2, Download, Search, UserCheck, CreditCard, XCircle, Calendar, MessageSquare, Clock, ArrowRightLeft, AlertCircle } from 'lucide-react'

const iconMap: Record<string, any> = {
  arrival: UserCheck,
  payment: CreditCard,
  cancel: XCircle,
  CHECK_IN: UserCheck,
  PAYMENT_CONFIRMED: CreditCard,
  APPOINTMENT_CANCELLED: XCircle,
  NEW_APPOINTMENT: Calendar,
  MESSAGE_RECEIVED: MessageSquare,
}

export default function MovimentoPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId
  const { data: events = [], isLoading } = useMovementData(clinicId, selectedDate)

  const eventTypeColors: Record<string, string> = {
    arrival: 'arrival',
    payment: 'payment',
    cancel: 'cancel',
  }

  const filtered = events.filter((e: any) => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Movimento</h2>
        <div className="export-btns">
          <button className="btn btn-secondary btn-sm"><Download size={14} /> CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="date" 
          className="input-field" 
          style={{ width: 'auto' }} 
          value={selectedDate} 
          onChange={e => setSelectedDate(e.target.value)} 
        />
        <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
          <Search size={16} />
          <input className="input-field" placeholder="Buscar evento..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="pill-tabs">
          {[
            { v: 'all', l: 'Todos' },
            { v: 'arrival', l: 'Atendimento' },
            { v: 'payment', l: 'Financeiro' },
            { v: 'cancel', l: 'Cancelamento' },
          ].map(f => (
            <button key={f.v} className={`pill-tab${typeFilter === f.v ? ' active' : ''}`} onClick={() => setTypeFilter(f.v)}>
              {f.l}
            </button>
          ))}
        </div>
        <select className="input-field" style={{ width: 'auto' }}>
          <option>Todos os Profissionais</option>
          <option>Dra. Maria Santos</option>
          <option>Dr. Carlos Mendes</option>
          <option>Dra. Ana Costa</option>
        </select>
      </div>

      {/* Event Log */}
      <div className="card" style={{ padding: 0 }}>
        <div className="event-log">
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhum evento registrado.</div>}
          {filtered.map((event: any, i: number) => {
            const Icon = iconMap[event.icon] || AlertCircle
            return (
              <div key={i} className="event-row">
                <span className="event-time">{event.time} — {new Date(selectedDate).toLocaleDateString('pt-BR')}</span>
                <div className={`event-icon ${eventTypeColors[event.type] || 'arrival'}`}>
                  <Icon size={14} />
                </div>
                <span className="event-description">{event.description}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{event.professional}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="metrics-row" style={{ marginTop: 'var(--space-6)' }}>
        <div className="metric-card"><span className="metric-label">Check-ins</span><span className="metric-value">12</span></div>
        <div className="metric-card"><span className="metric-label">Cobranças</span><span className="metric-value">8</span></div>
        <div className="metric-card"><span className="metric-label">Cancelamentos</span><span className="metric-value" style={{ color: 'var(--color-accent-danger)' }}>1</span></div>
        <div className="metric-card"><span className="metric-label">Mensagens</span><span className="metric-value">15</span></div>
      </div>
    </div>
  )
}
