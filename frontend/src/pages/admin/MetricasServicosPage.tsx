import { useState } from 'react'
import { Download, Clock } from 'lucide-react'
import { useServiceMetrics } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'


export default function MetricasServicosPage() {
  const [period, setPeriod] = useState('30 dias')
  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId

  const periodsMap: Record<string, number> = {
    'Hoje': 1,
    '7 dias': 7,
    '30 dias': 30,
    '3 meses': 90,
    '12 meses': 365
  }

  const endDate = new Date().toISOString().split('T')[0]
  const startDateObj = new Date()
  startDateObj.setDate(startDateObj.getDate() - (periodsMap[period] || 30))
  const startDate = startDateObj.toISOString().split('T')[0]

  const { data, isLoading } = useServiceMetrics(clinicId, startDate, endDate)
  const services = data?.services || []
  const peakHours = data?.peakHours || []

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  if (isLoading) return <div style={{ padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Carregando métricas...</div>

  const totalCount = services.reduce((sum: number, s: any) => sum + s.count, 0)
  const totalRevenue = services.reduce((sum: number, s: any) => sum + s.revenue, 0)

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Métricas de Serviços</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="date-presets">
            {Object.keys(periodsMap).map(p => (<button key={p} className={`date-preset${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>))}
          </div>
          <div className="export-btns">
            <button className="btn btn-secondary btn-sm"><Download size={14} /> CSV</button>
            <button className="btn btn-secondary btn-sm"><Download size={14} /> PDF</button>
          </div>
        </div>
      </div>

      <div className="metrics-row stagger-children">
        <div className="metric-card"><span className="metric-label">Total Realizações</span><span className="metric-value">{totalCount}</span></div>
        <div className="metric-card"><span className="metric-label">Receita Total</span><span className="metric-value">{formatCurrency(totalRevenue)}</span></div>
        <div className="metric-card"><span className="metric-label">Ticket Médio</span><span className="metric-value">{formatCurrency(totalCount > 0 ? totalRevenue / totalCount : 0)}</span></div>
        <div className="metric-card"><span className="metric-label">Serviços Ativos</span><span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>{services.length}</span></div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3><Clock size={16} style={{ display: 'inline', marginRight: 8 }} />Horários de Pico</h3>
          <div className="chart-placeholder">
            {peakHours.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', width: '100%' }}>Sem dados de pico.</p>}
            {peakHours.map((h: any, i: number) => {
              const maxCount = Math.max(...peakHours.map((ph: any) => ph.count)) || 1
              const height = (h.count / maxCount) * 100
              return (
                <div key={i} className="bar-wrapper" title={`${h.hour}: ${h.count} atendimentos`}>
                  <div className="bar" style={{ height: `${height + 5}%`, background: h.count === maxCount ? 'var(--color-accent-gold)' : 'var(--color-accent-emerald)' }} />
                  <span style={{ fontSize: 10, marginTop: 4, color: 'var(--color-text-muted)' }}>{h.hour.split(':')[0]}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="chart-card">
          <h3>Receita por Serviço</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {services.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados.</p>}
            {services.slice(0, 5).sort((a: any, b: any) => b.revenue - a.revenue).map((s: any, i: number) => {
              const maxRev = Math.max(...services.map((sv: any) => sv.revenue)) || 1
              const pct = (s.revenue / maxRev) * 100
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{s.name}</span><span style={{ fontWeight: 500 }}>{formatCurrency(s.revenue)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--color-accent-gold)' }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>Serviço</th><th>Realizações</th><th>Receita Total</th><th>Preço Médio</th><th>Status</th></tr></thead>
          <tbody>
            {services.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>Nenhum serviço registrado no período.</td></tr>}
            {services.sort((a: any, b: any) => b.revenue - a.revenue).map((s: any, i: number) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{s.name}</td>
                <td>{s.count}</td>
                <td style={{ color: 'var(--color-accent-gold)', fontWeight: 500 }}>{formatCurrency(s.revenue)}</td>
                <td>{formatCurrency(s.avgPrice)}</td>
                <td><span className="badge badge-emerald">Ativo</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
