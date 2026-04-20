import { useState } from 'react'
import { Download, Users, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, UserPlus, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useMarketingMetrics } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'

const periods = ['7 dias', '30 dias', '3 meses', '12 meses']

const dayLabels: Record<string, string> = {
  'Sunday': 'Dom', 'Monday': 'Seg', 'Tuesday': 'Ter', 'Wednesday': 'Qua',
  'Thursday': 'Qui', 'Friday': 'Sex', 'Saturday': 'Sab',
  'Dom': 'Dom', 'Seg': 'Seg', 'Ter': 'Ter', 'Qua': 'Qua',
  'Qui': 'Qui', 'Sex': 'Sex', 'Sab': 'Sab'
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

export default function MarketingPage() {
  const [period, setPeriod] = useState('30 dias')
  const { user } = useAuth()
  const clinicId = user?.clinicId
  const { data, isLoading } = useMarketingMetrics(clinicId, undefined, undefined, period)

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>

  const totalAppointments = data?.totalAppointments || 0
  const completedAppointments = data?.completedAppointments || 0
  const cancelledAppointments = data?.cancelledAppointments || 0
  const revenue = data?.revenue || 0
  const appointmentsTrend = data?.appointmentsTrend || 0
  const newPatients = data?.newPatients || 0
  const funnel = data?.funnel || { agendados: 0, confirmados: 0, concluidos: 0, cancelados: 0, confirmadosPct: 0, concluidosPct: 0, canceladosPct: 0 }
  const byService = data?.byService || []
  const byDayOfWeek = data?.byDayOfWeek || []
  const topServicesByRevenue = data?.topServicesByRevenue || []

  const completionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0
  const cancellationRate = totalAppointments > 0 ? Math.round((cancelledAppointments / totalAppointments) * 100) : 0

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Marketing</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="date-presets">
            {periods.map(p => (
              <button key={p} className={`date-preset${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> CSV</button>
        </div>
      </div>

      {/* Cards - Linha 1 */}
      <div className="metrics-row stagger-children">
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> Agendamentos</span>
          <span className="metric-value">{totalAppointments}</span>
          <TrendBadge value={appointmentsTrend} />
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> Concluídos</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>{completedAppointments}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{completionRate}% dos agendamentos</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={14} /> Cancelados</span>
          <span className="metric-value" style={{ color: cancelledAppointments > 0 ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)' }}>{cancelledAppointments}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{cancellationRate}% taxa</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserPlus size={14} /> Novos Pacientes</span>
          <span className="metric-value">{newPatients}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>no período</span>
        </div>
      </div>

      {/* Cards - Linha 2 */}
      <div className="metrics-row stagger-children" style={{ marginTop: 'var(--space-4)' }}>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> Receita</span>
          <span className="metric-value">{fmt(revenue)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>pagamentos concluídos</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Ticket Médio</span>
          <span className="metric-value">{fmt(completedAppointments > 0 ? revenue / completedAppointments : 0)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>por atendimento</span>
        </div>
        <div className="metric-card" style={{ gridColumn: 'span 2' }}>
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} /> Funil de Conversão</span>
          <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{funnel.agendados}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Agendados</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>&rarr;</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent-brand)' }}>{funnel.confirmados}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Confirmados ({funnel.confirmadosPct}%)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>&rarr;</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent-emerald)' }}>{funnel.concluidos}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Concluídos ({funnel.concluidosPct}%)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>|</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent-danger)' }}>{funnel.cancelados}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Cancelados ({funnel.canceladosPct}%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-row" style={{ marginTop: 'var(--space-6)' }}>
        <div className="chart-card">
          <h3>Agendamentos por Dia da Semana</h3>
          <div className="chart-placeholder" style={{ alignItems: 'flex-end' }}>
            {byDayOfWeek.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados no período.</p>}
            {byDayOfWeek.map((d, i) => {
              const maxCount = Math.max(...byDayOfWeek.map(x => x.count)) || 1
              const hPct = (d.count / maxCount) * 100
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, margin: '0 2px', height: '100%' }}>
                  <div
                    title={`${d.day}: ${d.count} agendamentos`}
                    style={{ height: `${Math.max(hPct, 4)}%`, minHeight: 4, background: 'var(--color-accent-brand)', borderRadius: '4px 4px 0 0', opacity: hPct === 100 ? 1 : 0.6 }}
                  />
                  <span style={{ fontSize: 10, marginTop: 4, color: 'var(--color-text-muted)', textAlign: 'center' }}>{dayLabels[d.day] || d.day}</span>
                  <span style={{ fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'center' }}>{d.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="chart-card">
          <h3>Agendamentos por Serviço</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4) 0' }}>
            {byService.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados no período.</p>}
            {byService.map((s, i) => {
              const maxVal = Math.max(...byService.map(x => x.value)) || 1
              const pct = (s.value / maxVal) * 100
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{s.name} ({s.pct}%)</span>
                    <span style={{ fontWeight: 500 }}>{s.value} agend.</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Serviços por Receita */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          Top Serviços por Receita
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Agendamentos</th>
              <th>% do Total</th>
              <th>Receita</th>
            </tr>
          </thead>
          <tbody>
            {topServicesByRevenue.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>Nenhum dado encontrado no período.</td></tr>
            )}
            {topServicesByRevenue.map((s, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{s.name}</td>
                <td>{s.value}</td>
                <td><span className="badge badge-gold">{s.pct}%</span></td>
                <td style={{ fontWeight: 700, color: 'var(--color-accent-emerald)' }}>{fmt(s.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
