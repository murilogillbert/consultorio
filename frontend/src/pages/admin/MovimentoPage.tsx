import { useState } from 'react'
import { Download, Search, UserCheck, CreditCard, XCircle, Calendar, MessageSquare, Clock, ArrowRightLeft } from 'lucide-react'

const events = [
  { time: '07:12', type: 'arrival', description: 'João Silva realizou check-in', professional: 'Dra. Maria Santos', icon: UserCheck },
  { time: '07:30', type: 'arrival', description: 'Início de atendimento — João Silva', professional: 'Dra. Maria Santos', icon: Clock },
  { time: '08:05', type: 'arrival', description: 'Fim de atendimento — João Silva', professional: 'Dra. Maria Santos', icon: UserCheck },
  { time: '08:15', type: 'payment', description: 'Cobrança emitida — R$ 250,00 (PIX)', professional: '—', icon: CreditCard },
  { time: '08:16', type: 'payment', description: 'Pagamento confirmado via webhook — PIX', professional: '—', icon: CreditCard },
  { time: '09:00', type: 'arrival', description: 'Maria Oliveira realizou check-in', professional: 'Dra. Ana Costa', icon: UserCheck },
  { time: '09:05', type: 'arrival', description: 'Início de atendimento — Maria Oliveira', professional: 'Dra. Ana Costa', icon: Clock },
  { time: '09:30', type: 'cancel', description: 'Cancelamento — Pedro Santos (motivo: imprevisto pessoal)', professional: 'Dr. Carlos Mendes', icon: XCircle },
  { time: '09:35', type: 'arrival', description: 'Remarcação de Pedro Santos para 02/04 às 10h', professional: 'Dr. Carlos Mendes', icon: ArrowRightLeft },
  { time: '10:00', type: 'arrival', description: 'Ana Lima realizou check-in', professional: 'Dr. Carlos Mendes', icon: UserCheck },
  { time: '10:15', type: 'payment', description: 'Cobrança emitida — R$ 450,00 (Cartão)', professional: '—', icon: CreditCard },
  { time: '10:20', type: 'arrival', description: 'Mensagem recebida via WhatsApp de Carlos Ferreira', professional: '—', icon: MessageSquare },
  { time: '11:00', type: 'arrival', description: 'Novo agendamento — Lucia Souza para 30/03 às 14h', professional: 'Dra. Maria Santos', icon: Calendar },
  { time: '11:30', type: 'payment', description: 'Pagamento confirmado — R$ 450,00 (Cartão)', professional: '—', icon: CreditCard },
  { time: '14:00', type: 'arrival', description: 'Roberta Costa realizou check-in', professional: 'Dr. Pedro Lima', icon: UserCheck },
]

const eventTypeColors: Record<string, string> = {
  arrival: 'arrival',
  payment: 'payment',
  cancel: 'cancel',
}

export default function MovimentoPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = events.filter(e => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

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
        <input type="date" className="input-field" style={{ width: 'auto' }} defaultValue="2026-03-28" />
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
          {filtered.map((event, i) => {
            const Icon = event.icon
            return (
              <div key={i} className="event-row">
                <span className="event-time">{event.time} — 28/03/2026</span>
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
