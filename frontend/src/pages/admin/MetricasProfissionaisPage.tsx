import { useState } from 'react'
import { Download } from 'lucide-react'
import { useProfessionalMetrics } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'

const periods = ['Hoje', '7 dias', '30 dias', '3 meses', '12 meses']

export default function MetricasProfissionaisPage() {
  const [period, setPeriod] = useState('30 dias')
  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId
  const { data: professionals = [], isLoading } = useProfessionalMetrics(clinicId)

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  if (isLoading) return <div style={{ padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Carregando métricas...</div>

  const totalAppointments = professionals.reduce((sum, p) => sum + p.appointments, 0)
  const totalRevenue = professionals.reduce((sum, p) => sum + p.revenue, 0)
  const avgOccupancy = professionals.length > 0 ? Math.round(professionals.reduce((sum, p) => sum + p.occupancy, 0) / professionals.length) : 0
  const avgRating = professionals.length > 0 ? (professionals.reduce((sum, p) => sum + p.rating, 0) / professionals.length).toFixed(1) : '0'


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

      {/* Summary cards */}
      <div className="metrics-row stagger-children">
        <div className="metric-card"><span className="metric-label">Total Atendimentos</span><span className="metric-value">{totalAppointments}</span></div>
        <div className="metric-card"><span className="metric-label">Ocupação Média</span><span className="metric-value">{avgOccupancy}%</span></div>
        <div className="metric-card"><span className="metric-label">Receita Total</span><span className="metric-value">{formatCurrency(totalRevenue)}</span></div>
        <div className="metric-card"><span className="metric-label">Avaliação Média</span><span className="metric-value" style={{ color: 'var(--color-accent-gold)' }}>{avgRating} ★</span></div>
      </div>

      {/* Occupancy Chart */}
      <div className="chart-card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3>Taxa de Ocupação por Profissional</h3>
        <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-end', padding: 'var(--space-6) 0' }}>
          {professionals.length === 0 && <p style={{ padding: 20, color: 'var(--color-text-muted)' }}>Sem dados para o gráfico.</p>}
          {professionals.map((p, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8 }}>
                <div style={{ width: 48, height: `${p.occupancy * 1.6}px`, background: 'var(--color-accent-emerald)', borderRadius: '8px 8px 0 0', opacity: 0.7 + (i * 0.05) }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent-emerald)' }}>{p.occupancy}%</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{p.name.split(' ').slice(-1)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Profissional</th>
              <th>Atendimentos</th>
              <th>Ocupação</th>
              <th>Receita</th>
              <th>Ticket Médio</th>
              <th>Avaliação</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {professionals.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>Nenhum profissional encontrado no período.</td></tr>}
            {professionals.sort((a, b) => b.appointments - a.appointments).map((p, i) => (
              <tr key={i}>
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
                <td style={{ fontWeight: 500 }}>{p.appointments}</td>
                <td>
                  <div className="progress-bar" style={{ width: 60, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}>
                    <div className="progress-bar-fill" style={{ width: `${p.occupancy}%` }} />
                  </div>
                  {p.occupancy}%
                </td>
                <td style={{ fontWeight: 500, color: 'var(--color-accent-gold)' }}>{formatCurrency(p.revenue)}</td>
                <td>{formatCurrency(p.appointments > 0 ? p.revenue / p.appointments : 0)}</td>
                <td style={{ color: 'var(--color-accent-gold)' }}>{(p.rating ?? 0).toFixed(1)} ★</td>
                <td><span className="badge badge-gold">Estável</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
