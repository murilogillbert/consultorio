import { useState } from 'react'
import { Download, TrendingUp, TrendingDown, Minus, Users, DollarSign, UserCheck, BarChart3, Star, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { useProfessionalMetrics, type ProfessionalMetric } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'

const periods = ['Hoje', '7 dias', '30 dias', '3 meses', '12 meses']

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

function StatusBadge({ status }: { status: ProfessionalMetric['status'] }) {
  const config = {
    destaque: { label: 'Destaque', className: 'badge badge-emerald', icon: <CheckCircle size={11} /> },
    estavel: { label: 'Estável', className: 'badge badge-gold', icon: null },
    atencao: { label: 'Atenção', className: 'badge badge-warning', icon: <AlertTriangle size={11} /> },
    critico: { label: 'Crítico', className: 'badge badge-danger', icon: <XCircle size={11} /> },
  }
  const c = config[status] || config.estavel
  return <span className={c.className} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{c.icon}{c.label}</span>
}

export default function MetricasProfissionaisPage() {
  const [period, setPeriod] = useState('30 dias')
  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId
  const { data: professionals = [], isLoading } = useProfessionalMetrics(clinicId, undefined, undefined, period)

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  if (isLoading) return <div style={{ padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Carregando métricas...</div>

  // Agregações globais
  const totalAppointments = professionals.reduce((s, p) => s + p.appointments, 0)
  const totalCompleted = professionals.reduce((s, p) => s + p.completedCount, 0)
  const totalCancelled = professionals.reduce((s, p) => s + p.cancelledCount + p.noShowCount, 0)
  const totalRevenue = professionals.reduce((s, p) => s + p.revenue, 0)
  const totalPayout = professionals.reduce((s, p) => s + p.netPayout, 0)
  const avgOccupancy = professionals.length > 0 ? Math.round(professionals.reduce((s, p) => s + p.occupancy, 0) / professionals.length) : 0
  const avgCancellation = totalAppointments > 0 ? Math.round((totalCancelled / totalAppointments) * 100) : 0
  const avgConversion = professionals.length > 0 ? Math.round(professionals.reduce((s, p) => s + p.conversionRate, 0) / professionals.length) : 0
  const avgRating = professionals.length > 0 ? (professionals.reduce((s, p) => s + p.rating, 0) / professionals.length) : 0
  const totalNewPatients = professionals.reduce((s, p) => s + p.newPatients, 0)

  // Profissional destaque
  const sorted = [...professionals].sort((a, b) => b.revenue - a.revenue)
  const topPro = sorted[0]

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Métricas de Profissionais</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="date-presets">
            {periods.map(p => (
              <button key={p} className={`date-preset${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <div className="export-btns">
            <button className="btn btn-secondary btn-sm"><Download size={14} /> CSV</button>
            <button className="btn btn-secondary btn-sm"><Download size={14} /> PDF</button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo - Linha 1 */}
      <div className="metrics-row stagger-children">
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> Total Atendimentos</span>
          <span className="metric-value">{totalAppointments}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{totalCompleted} concluídos</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} /> Receita Total</span>
          <span className="metric-value">{fmt(totalRevenue)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Repasse: {fmt(totalPayout)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserCheck size={14} /> Ocupação Média</span>
          <span className="metric-value">{avgOccupancy}%</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Conversão: {avgConversion}%</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star size={14} /> Avaliação Média</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-gold)' }}>{avgRating.toFixed(1)} ★</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{professionals.reduce((s, p) => s + p.reviewCount, 0)} avaliações</span>
        </div>
      </div>

      {/* Cards de Resumo - Linha 2 */}
      <div className="metrics-row stagger-children" style={{ marginTop: 'var(--space-4)' }}>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={14} /> Tx. Cancelamento</span>
          <span className="metric-value" style={{ color: avgCancellation > 20 ? 'var(--color-accent-danger)' : avgCancellation > 10 ? 'var(--color-accent-gold)' : 'var(--color-accent-emerald)' }}>
            {avgCancellation}%
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{totalCancelled} cancelados/ausências</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Novos Pacientes</span>
          <span className="metric-value">{totalNewPatients}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>no período</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} /> Profissional Destaque</span>
          <span className="metric-value" style={{ fontSize: 18 }}>{topPro?.name?.split(' ').slice(0, 2).join(' ') || '—'}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{topPro ? fmt(topPro.revenue) : '—'}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} /> R$/Hora Média</span>
          <span className="metric-value">{fmt(professionals.length > 0 ? professionals.reduce((s, p) => s + p.revenuePerHour, 0) / professionals.length : 0)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>receita por hora disponível</span>
        </div>
      </div>

      {/* Gráficos lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
        {/* Gráfico de Ocupação */}
        <div className="chart-card">
          <h3>Ocupação por Profissional</h3>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', padding: 'var(--space-6) 0', minHeight: 200 }}>
            {professionals.length === 0 && <p style={{ padding: 20, color: 'var(--color-text-muted)' }}>Sem dados.</p>}
            {sorted.map((p, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8 }}>
                  <div style={{
                    width: 40, height: `${Math.max(p.occupancy * 1.6, 4)}px`,
                    background: p.occupancy > 70 ? 'var(--color-accent-emerald)' : p.occupancy > 40 ? 'var(--color-accent-gold)' : 'var(--color-accent-danger)',
                    borderRadius: '6px 6px 0 0', opacity: 0.85
                  }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: p.occupancy > 70 ? 'var(--color-accent-emerald)' : p.occupancy > 40 ? 'var(--color-accent-gold)' : 'var(--color-accent-danger)' }}>{p.occupancy}%</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.name.split(' ').slice(-1)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Cancelamento */}
        <div className="chart-card">
          <h3>Cancelamento e No-Show</h3>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', padding: 'var(--space-6) 0', minHeight: 200 }}>
            {professionals.length === 0 && <p style={{ padding: 20, color: 'var(--color-text-muted)' }}>Sem dados.</p>}
            {sorted.map((p, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, marginBottom: 8 }}>
                  <div title="Cancelados" style={{
                    width: 18, height: `${Math.max(p.cancelledCount * 12, 2)}px`,
                    background: 'var(--color-accent-danger)', borderRadius: '4px 4px 0 0', opacity: 0.8
                  }} />
                  <div title="No-show" style={{
                    width: 18, height: `${Math.max(p.noShowCount * 12, 2)}px`,
                    background: 'var(--color-accent-gold)', borderRadius: '4px 4px 0 0', opacity: 0.8
                  }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: p.cancellationRate > 20 ? 'var(--color-accent-danger)' : 'var(--color-text-secondary)' }}>{p.cancellationRate}%</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.name.split(' ').slice(-1)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-accent-danger)', opacity: 0.8, display: 'inline-block' }} /> Cancelados</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-accent-gold)', opacity: 0.8, display: 'inline-block' }} /> No-show</span>
          </div>
        </div>
      </div>

      {/* Tabela de Ranking */}
      <div className="card" style={{ padding: 0, overflow: 'auto', marginTop: 'var(--space-6)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Profissional</th>
              <th>Atendimentos</th>
              <th>Ocupação</th>
              <th>Receita</th>
              <th>Ticket Médio</th>
              <th>Cancelamento</th>
              <th>Pacientes</th>
              <th>Repasse</th>
              <th>Avaliação</th>
              <th>Tendência</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {professionals.length === 0 && <tr><td colSpan={12} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>Nenhum profissional encontrado no período.</td></tr>}
            {sorted.map((p, i) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700, color: 'var(--color-accent-gold)' }}>{i + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar avatar-sm avatar-placeholder">
                      {p.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.specialty}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{p.appointments}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.completedCount} concl.</div>
                </td>
                <td>
                  <div className="progress-bar" style={{ width: 50, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
                    <div className="progress-bar-fill" style={{
                      width: `${p.occupancy}%`,
                      background: p.occupancy > 70 ? 'var(--color-accent-emerald)' : p.occupancy > 40 ? 'var(--color-accent-gold)' : 'var(--color-accent-danger)'
                    }} />
                  </div>
                  {p.occupancy}%
                </td>
                <td style={{ fontWeight: 500, color: 'var(--color-accent-gold)' }}>{fmt(p.revenue)}</td>
                <td>{fmt(p.appointments > 0 ? p.revenue / p.appointments : 0)}</td>
                <td>
                  <span style={{
                    fontWeight: 600, fontSize: 13,
                    color: p.cancellationRate > 20 ? 'var(--color-accent-danger)' : p.cancellationRate > 10 ? 'var(--color-accent-gold)' : 'var(--color-accent-emerald)'
                  }}>
                    {p.cancellationRate}%
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.cancelledCount + p.noShowCount} total</div>
                </td>
                <td>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--color-accent-emerald)', fontWeight: 500 }}>{p.newPatients}</span>
                    <span style={{ color: 'var(--color-text-muted)', margin: '0 2px' }}>/</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{p.returningPatients}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>novos / retorno</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{fmt(p.netPayout)}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{p.commissionPct}%</div>
                </td>
                <td>
                  <span style={{ color: 'var(--color-accent-gold)', fontWeight: 500 }}>{p.rating > 0 ? p.rating.toFixed(1) : '—'} ★</span>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{p.reviewCount} aval.</div>
                </td>
                <td>
                  <TrendBadge value={p.revenueTrend} />
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>receita</div>
                </td>
                <td><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
