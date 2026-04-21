import { useState } from 'react'
import { useMovementData } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, Download, Search, UserCheck, CreditCard, XCircle, Calendar,
  MessageSquare, AlertCircle, TrendingUp, TrendingDown, Minus, Clock,
  UserPlus, DollarSign, CheckCircle, Activity
} from 'lucide-react'

const iconMap: Record<string, any> = {
  CHECK_IN: UserCheck,
  PAYMENT_CONFIRMED: CreditCard,
  APPOINTMENT_CANCELLED: XCircle,
  NEW_APPOINTMENT: Calendar,
  MESSAGE_RECEIVED: MessageSquare,
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'var(--color-text-muted)',
  CONFIRMED: 'var(--color-accent-brand)',
  IN_PROGRESS: 'var(--color-accent-gold)',
  COMPLETED: 'var(--color-accent-emerald)',
  CANCELLED: 'var(--color-accent-danger)',
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: 'var(--color-text-muted)' }}><Minus size={12} /> 0%</span>
  const positive = value > 0
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, color: positive ? 'var(--color-accent-emerald)' : 'var(--color-accent-danger)' }}>
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {positive ? '+' : ''}{value}%
    </span>
  )
}

export default function MovimentoPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [proFilter, setProFilter] = useState('all')
  const { user } = useAuth()
  const clinicId = user?.clinicId
  const { data, isLoading } = useMovementData(clinicId, selectedDate)

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>

  const totalAppointments = data?.totalAppointments || 0
  const scheduled = data?.scheduled || 0
  const confirmed = data?.confirmed || 0
  const inProgress = data?.inProgress || 0
  const completed = data?.completed || 0
  const cancelled = data?.cancelled || 0
  const showRate = data?.showRate || 0
  const revenueToday = data?.revenueToday || 0
  const pendingToday = data?.pendingToday || 0
  const newPatients = data?.newPatients || 0
  const messagesCount = data?.messagesCount || 0
  const apptsTrend = data?.apptsTrend || 0
  const revenueTrend = data?.revenueTrend || 0
  const completedTrend = data?.completedTrend || 0
  const statusBreakdown = data?.statusBreakdown || []
  const revenueByMethod = data?.revenueByMethod || []
  const hourlyDistribution = data?.hourlyDistribution || []
  const byProfessional = data?.byProfessional || []
  const events = data?.events || []
  const upcoming = data?.upcoming || []

  const filteredEvents = events.filter(e => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false
    if (proFilter !== 'all' && e.professional !== proFilter) return false
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Movimento</h2>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{dateLabel}</span>
        </div>
        <div className="metrics-header-actions">
          <input
            type="date"
            className="input-field"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm"><Download size={14} /> CSV</button>
        </div>
      </div>

      {/* -- Cards Linha 1: Operacional -- */}
      <div className="metrics-row stagger-children">
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> Agendamentos</span>
          <span className="metric-value">{totalAppointments}</span>
          <TrendBadge value={apptsTrend} />
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> Concluídos</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>{completed}</span>
          <TrendBadge value={completedTrend} />
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> Em Andamento</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-gold)' }}>{inProgress}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{scheduled} aguardando · {confirmed} confirmados</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={14} /> Cancelamentos</span>
          <span className="metric-value" style={{ color: cancelled > 0 ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)' }}>{cancelled}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{showRate}% comparecimento</span>
        </div>
      </div>

      {/* -- Cards Linha 2: Financeiro + Extras -- */}
      <div className="metrics-row stagger-children" style={{ marginTop: 'var(--space-4)' }}>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} /> Receita do Dia</span>
          <span className="metric-value">{fmt(revenueToday)}</span>
          <TrendBadge value={revenueTrend} />
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={14} /> Pendente</span>
          <span className="metric-value" style={{ color: pendingToday > 0 ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)' }}>{fmt(pendingToday)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>a receber</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserPlus size={14} /> Novos Pacientes</span>
          <span className="metric-value">{newPatients}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>cadastrados hoje</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14} /> Mensagens</span>
          <span className="metric-value">{messagesCount}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>pacientes</span>
        </div>
      </div>

      {/* -- Gráficos -- */}
      <div className="charts-row" style={{ marginTop: 'var(--space-6)' }}>
        {/* Distribuição por Status */}
        <div className="chart-card">
          <h3>Status dos Agendamentos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4) 0' }}>
            {statusBreakdown.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem agendamentos.</p>}
            {statusBreakdown.map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[s.status] || 'var(--color-text-muted)', display: 'inline-block' }} />
                    {s.label}
                  </span>
                  <span style={{ fontWeight: 500 }}>{s.count} ({s.pct}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${s.pct}%`, background: statusColors[s.status] || 'var(--color-accent-brand)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição por Hora */}
        <div className="chart-card">
          <h3><Clock size={16} style={{ display: 'inline', marginRight: 8 }} />Distribuição por Horário</h3>
          <div className="chart-placeholder" style={{ alignItems: 'flex-end' }}>
            {hourlyDistribution.map((h, i) => {
              const maxH = Math.max(...hourlyDistribution.map(x => x.total)) || 1
              const hPct = (h.total / maxH) * 100
              const hasCancel = h.cancelled > 0
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, margin: '0 1px', height: '100%' }}>
                  <div
                    title={`${h.hour}: ${h.total} agend. (${h.completed} concl., ${h.cancelled} canc.)`}
                    style={{
                      height: `${Math.max(hPct, 3)}%`, minHeight: h.total > 0 ? 4 : 0,
                      background: hasCancel ? 'var(--color-accent-danger)' : 'var(--color-accent-brand)',
                      borderRadius: '3px 3px 0 0',
                      opacity: h.total > 0 ? (hPct === 100 ? 1 : 0.6) : 0.1
                    }}
                  />
                  <span style={{ fontSize: 8, marginTop: 2, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    {h.hour.replace(':00', 'h')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* -- Receita por Método + Próximos Atendimentos -- */}
      <div className="charts-row" style={{ marginTop: 'var(--space-4)' }}>
        <div className="chart-card">
          <h3><CreditCard size={16} style={{ display: 'inline', marginRight: 8 }} />Receita por Forma de Pagamento</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4) 0' }}>
            {revenueByMethod.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhum pagamento registrado.</p>}
            {revenueByMethod.map((m, i) => {
              const maxVal = Math.max(...revenueByMethod.map(x => x.value)) || 1
              const pct = (m.value / maxVal) * 100
              const totalPct = revenueToday > 0 ? Math.round((m.value / revenueToday) * 100) : 0
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{m.name} ({totalPct}%)</span>
                    <span style={{ fontWeight: 500 }}>{fmt(m.value)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--color-accent-emerald)' }} /></div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="chart-card">
          <h3><Clock size={16} style={{ display: 'inline', marginRight: 8 }} />Próximos Atendimentos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 'var(--space-4) 0' }}>
            {upcoming.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhum atendimento pendente.</p>}
            {upcoming.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-accent-brand)', minWidth: 50 }}>{u.time}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{u.patient}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{u.service} · {u.duration}min · {u.professional}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: u.status === 'CONFIRMED' ? 'rgba(52,211,153,0.15)' : 'rgba(148,163,184,0.15)',
                  color: u.status === 'CONFIRMED' ? 'var(--color-accent-emerald)' : 'var(--color-text-muted)'
                }}>
                  {u.status === 'CONFIRMED' ? 'Confirmado' : 'Agendado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* -- Tabela: Profissionais do Dia -- */}
      <div className="card admin-table-card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          Resumo por Profissional
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Profissional</th>
              <th>Agendados</th>
              <th>Concluídos</th>
              <th>Cancelados</th>
              <th>Comparecimento</th>
              <th>Receita</th>
            </tr>
          </thead>
          <tbody>
            {byProfessional.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>Nenhum profissional com atendimento hoje.</td></tr>
            )}
            {byProfessional.map((p, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.specialty}</div>
                </td>
                <td>{p.total}</td>
                <td style={{ color: 'var(--color-accent-emerald)', fontWeight: 500 }}>{p.completed}</td>
                <td style={{ color: p.cancelled > 0 ? 'var(--color-accent-danger)' : 'inherit' }}>{p.cancelled}</td>
                <td>
                  <span className={`badge ${p.showRate >= 80 ? 'badge-emerald' : p.showRate >= 60 ? 'badge-gold' : 'badge-danger'}`}>
                    {p.showRate}%
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>{fmt(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* -- Timeline de Eventos -- */}
      <div className="card admin-table-card" style={{ marginTop: 'var(--space-6)', padding: 0 }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} /> Timeline de Eventos
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-input-wrapper" style={{ maxWidth: 240 }}>
              <Search size={16} />
              <input className="input-field" placeholder="Buscar evento..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="pill-tabs">
              {[
                { v: 'all', l: 'Todos' },
                { v: 'arrival', l: 'Atendimento' },
                { v: 'payment', l: 'Financeiro' },
                { v: 'cancel', l: 'Cancelamento' },
                { v: 'message', l: 'Mensagens' },
              ].map(f => (
                <button key={f.v} className={`pill-tab${typeFilter === f.v ? ' active' : ''}`} onClick={() => setTypeFilter(f.v)}>
                  {f.l}
                </button>
              ))}
            </div>
            {byProfessional.length > 0 && (
              <select className="input-field" style={{ width: 'auto' }} value={proFilter} onChange={e => setProFilter(e.target.value)}>
                <option value="all">Todos Profissionais</option>
                {byProfessional.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="event-log">
          {filteredEvents.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhum evento registrado.</div>
          )}
          {filteredEvents.map((event, i) => {
            const Icon = iconMap[event.icon] || AlertCircle
            const typeColor = event.type === 'payment' ? 'payment' : event.type === 'cancel' ? 'cancel' : event.type === 'message' ? 'message' : 'arrival'
            return (
              <div key={i} className="event-row">
                <span className="event-time">{event.time}</span>
                <div className={`event-icon ${typeColor}`}>
                  <Icon size={14} />
                </div>
                <span className="event-description">{event.description}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{event.professional}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
