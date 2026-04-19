import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Download, DollarSign, CreditCard, AlertTriangle, Users, CheckCircle, BarChart3 } from 'lucide-react'
import { useBillingData } from '../../hooks/useDashboard'
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

export default function FaturamentoPage() {
  const [period, setPeriod] = useState('30 dias')
  const { user } = useAuth()
  const clinicId = user?.clinicId
  const { data, isLoading } = useBillingData(clinicId, undefined, undefined, period)

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  if (isLoading) return <div style={{ padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Carregando dados financeiros...</div>

  const totalRevenue = data?.totalRevenue || 0
  const totalPayout = data?.totalPayout || 0
  const receitaLiquida = data?.receitaLiquida || 0
  const revenueTrend = data?.revenueTrend || 0
  const totalAppointments = data?.totalAppointments || 0
  const completedAppts = data?.completedAppts || 0
  const ticketMedio = data?.ticketMedio || 0
  const totalDelinquency = data?.totalDelinquency || 0
  const revenueByChannel = data?.revenueByChannel || []
  const payouts = data?.payouts || []
  const delinquency = data?.delinquency || []
  const monthlyRevenue = data?.monthlyRevenue || []
  const monthlyTotal = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0)
  const monthlyAverage = monthlyRevenue.length > 0 ? monthlyTotal / monthlyRevenue.length : 0
  const bestMonth = monthlyRevenue.reduce((best, m) => (m.revenue > best.revenue ? m : best), monthlyRevenue[0] || { month: '--', revenue: 0 })
  const worstMonth = monthlyRevenue.reduce((worst, m) => (m.revenue < worst.revenue ? m : worst), monthlyRevenue[0] || { month: '--', revenue: 0 })
  const latestMonth = monthlyRevenue[monthlyRevenue.length - 1]
  const latestVsAverage = monthlyAverage > 0 && latestMonth ? Math.round((latestMonth.revenue / monthlyAverage - 1) * 100) : 0
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(d => d.revenue)) || 1

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Faturamento</h2>
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

      {/* Cards - Linha 1 */}
      <div className="metrics-row stagger-children">
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} /> Receita Bruta</span>
          <span className="metric-value">{fmt(totalRevenue)}</span>
          <TrendBadge value={revenueTrend} />
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Repasses</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-danger)' }}>-{fmt(totalPayout)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{payouts.length} profissional(is)</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> Receita Liquida</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>{fmt(receitaLiquida)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>margem: {totalRevenue > 0 ? Math.round((receitaLiquida / totalRevenue) * 100) : 0}%</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> Atendimentos</span>
          <span className="metric-value">{totalAppointments}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{completedAppts} concluidos</span>
        </div>
      </div>

      {/* Cards - Linha 2 */}
      <div className="metrics-row stagger-children" style={{ marginTop: 'var(--space-4)' }}>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={14} /> Ticket Medio</span>
          <span className="metric-value">{fmt(ticketMedio)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>por atendimento concluido</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> Inadimplencia</span>
          <span className="metric-value" style={{ color: totalDelinquency > 0 ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)' }}>
            {fmt(totalDelinquency)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{delinquency.length} pagamento(s) pendente(s)</span>
        </div>
        <div className="metric-card" style={{ gridColumn: 'span 2' }}>
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={14} /> Receita por Canal</span>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 8, flexWrap: 'wrap' }}>
            {revenueByChannel.length === 0 && <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados</span>}
            {revenueByChannel.map((ch, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{ch.name}:</span>
                <span style={{ color: 'var(--color-accent-gold)' }}>{fmt(ch.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graficos */}
      <div className="charts-row" style={{ marginTop: 'var(--space-6)' }}>
        <div className="chart-card">
          <h3><CreditCard size={16} style={{ display: 'inline', marginRight: 8 }} />Receita por Canal de Pagamento</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4) 0' }}>
            {revenueByChannel.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados no periodo.</p>}
            {revenueByChannel.map((ch, i) => {
              const maxVal = Math.max(...revenueByChannel.map(c => c.value)) || 1
              const pct = (ch.value / maxVal) * 100
              const totalPct = totalRevenue > 0 ? Math.round((ch.value / totalRevenue) * 100) : 0
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{ch.name} ({totalPct}%)</span>
                    <span style={{ fontWeight: 500 }}>{fmt(ch.value)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--color-accent-emerald)' }} /></div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="chart-card">
          <h3>Faturamento Mensal (12 meses)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, margin: '12px 0 16px' }}>
            <div className="metric-card" style={{ padding: 12, minHeight: 'auto' }}>
              <span className="metric-label">Média mensal</span>
              <span className="metric-value" style={{ fontSize: 20 }}>{fmt(monthlyAverage)}</span>
            </div>
            <div className="metric-card" style={{ padding: 12, minHeight: 'auto' }}>
              <span className="metric-label">Melhor mês</span>
              <span className="metric-value" style={{ fontSize: 20 }}>{bestMonth.month}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{fmt(bestMonth.revenue)}</span>
            </div>
            <div className="metric-card" style={{ padding: 12, minHeight: 'auto' }}>
              <span className="metric-label">Pior mês</span>
              <span className="metric-value" style={{ fontSize: 20 }}>{worstMonth.month}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{fmt(worstMonth.revenue)}</span>
            </div>
            <div className="metric-card" style={{ padding: 12, minHeight: 'auto' }}>
              <span className="metric-label">Último mês vs média</span>
              <span className="metric-value" style={{ fontSize: 20, color: latestVsAverage >= 0 ? 'var(--color-accent-emerald)' : 'var(--color-accent-danger)' }}>
                {latestVsAverage >= 0 ? '+' : ''}{latestVsAverage}%
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{latestMonth ? fmt(latestMonth.revenue) : '—'}</span>
            </div>
          </div>
          <div className="chart-placeholder" style={{ position: 'relative', minHeight: 240, alignItems: 'flex-end' }}>
            {monthlyRevenue.length > 0 && (
              <>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${100 - (monthlyAverage / maxMonthlyRevenue) * 100}%`,
                  borderTop: '1px dashed var(--color-text-muted)',
                  opacity: 0.7,
                  pointerEvents: 'none'
                }} />
                <span style={{
                  position: 'absolute',
                  right: 0,
                  top: `${Math.max(0, 100 - (monthlyAverage / maxMonthlyRevenue) * 100) - 2}%`,
                  fontSize: 10,
                  color: 'var(--color-text-muted)',
                  background: 'var(--color-surface)',
                  padding: '0 4px'
                }}>
                  média {fmt(monthlyAverage)}
                </span>
              </>
            )}
            {monthlyRevenue.map((h: any, i: number) => {
              const hPct = (h.revenue / maxMonthlyRevenue) * 100
              const isLatest = i === monthlyRevenue.length - 1
              const isAboveAvg = h.revenue >= monthlyAverage
              return (
                <div key={i} className="bar-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, margin: '0 2px' }}>
                  <div
                    title={`${h.month}: ${fmt(h.revenue)}`}
                    style={{
                      height: `${Math.max(hPct, 2)}%`,
                      minHeight: 2,
                      background: isAboveAvg ? 'var(--color-accent-brand)' : 'var(--color-accent-gold)',
                      borderRadius: '4px 4px 0 0',
                      opacity: isLatest ? 1 : 0.7
                    }}
                  />
                  <span style={{ fontSize: 9, marginTop: 4, color: 'var(--color-text-muted)' }}>{h.month}</span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
            <span>Acumulado em 12 meses: {fmt(monthlyTotal)}</span>
            <span>Amplitude: {fmt(bestMonth.revenue - worstMonth.revenue)}</span>
          </div>
        </div>
      </div>

      {/* Tabela Repasses */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          Repasses por Profissional
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Profissional</th>
              <th>Atendimentos</th>
              <th>Receita Bruta</th>
              <th>Comissao</th>
              <th>Repasse</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>Nenhum repasse registrado no periodo.</td></tr>
            )}
            {payouts.map((p, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.specialty}</div>
                </td>
                <td>{p.appointments}</td>
                <td>{fmt(p.gross)}</td>
                <td><span className="badge badge-gold">{p.pct}</span></td>
                <td style={{ fontWeight: 700, color: 'var(--color-accent-emerald)' }}>{fmt(p.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tabela Inadimplencia */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          <AlertTriangle size={18} color="var(--color-accent-danger)" />
          Inadimplencia (Pagamentos Pendentes)
        </h3>
        {delinquency.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>Nenhum pagamento pendente detectado.</p>
        )}
        {delinquency.map((d, i) => (
          <div key={i} className="alert-row urgent" style={{ marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{d.patient}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {d.service} · {d.days} dias pendente
              </div>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--color-accent-danger)' }}>{fmt(d.value)}</span>
            <button className="btn btn-ghost btn-sm">Cobrar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
