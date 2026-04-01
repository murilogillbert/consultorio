import { useState } from 'react'
import { Download, TrendingUp, TrendingDown } from 'lucide-react'

const periods = ['Hoje', '7 dias', '30 dias', '3 meses', '12 meses']
const professionals = [
  { name: 'Dra. Maria Santos', specialty: 'Cardiologia', appointments: 145, occupancy: 87, revenue: 'R$ 36.250', ticket: 'R$ 250', return: '34%', rating: 4.9, change: +12 },
  { name: 'Dr. Carlos Mendes', specialty: 'Neurologia', appointments: 89, occupancy: 72, revenue: 'R$ 40.050', ticket: 'R$ 450', return: '28%', rating: 4.8, change: +5 },
  { name: 'Dra. Ana Costa', specialty: 'Oftalmologia', appointments: 67, occupancy: 65, revenue: 'R$ 13.400', ticket: 'R$ 200', return: '22%', rating: 4.7, change: -3 },
  { name: 'Dr. Pedro Lima', specialty: 'Ortopedia', appointments: 48, occupancy: 45, revenue: 'R$ 14.400', ticket: 'R$ 300', return: '30%', rating: 4.9, change: -8 },
]

export default function MetricasProfissionaisPage() {
  const [period, setPeriod] = useState('30 dias')

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
        <div className="metric-card"><span className="metric-label">Total Atendimentos</span><span className="metric-value">349</span><span className="metric-change positive"><TrendingUp size={12} /> +8% vs anterior</span></div>
        <div className="metric-card"><span className="metric-label">Ocupação Média</span><span className="metric-value">67%</span><span className="metric-change positive"><TrendingUp size={12} /> +3%</span></div>
        <div className="metric-card"><span className="metric-label">Receita Total</span><span className="metric-value">R$ 104.100</span><span className="metric-change positive"><TrendingUp size={12} /> +12%</span></div>
        <div className="metric-card"><span className="metric-label">Avaliação Média</span><span className="metric-value" style={{ color: 'var(--color-accent-gold)' }}>4.8 ★</span></div>
      </div>

      {/* Occupancy Chart */}
      <div className="chart-card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3>Taxa de Ocupação por Profissional</h3>
        <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-end', padding: 'var(--space-6) 0' }}>
          {professionals.map((p, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8 }}>
                <div style={{ width: 48, height: `${p.occupancy * 1.6}px`, background: 'var(--color-accent-emerald)', borderRadius: '8px 8px 0 0', opacity: 0.7 + (i * 0.08) }} />
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
              <th>Retorno</th>
              <th>Avaliação</th>
              <th>Variação</th>
            </tr>
          </thead>
          <tbody>
            {professionals.sort((a, b) => b.appointments - a.appointments).map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700, color: 'var(--color-accent-gold)' }}>{i + 1}</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="avatar avatar-sm avatar-placeholder">{p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div><div><div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.specialty}</div></div></div></td>
                <td style={{ fontWeight: 500 }}>{p.appointments}</td>
                <td><div className="progress-bar" style={{ width: 60, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}><div className="progress-bar-fill" style={{ width: `${p.occupancy}%` }} /></div>{p.occupancy}%</td>
                <td style={{ fontWeight: 500, color: 'var(--color-accent-gold)' }}>{p.revenue}</td>
                <td>{p.ticket}</td>
                <td>{p.return}</td>
                <td style={{ color: 'var(--color-accent-gold)' }}>{p.rating} ★</td>
                <td><span className={`metric-change ${p.change >= 0 ? 'positive' : 'negative'}`}>{p.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(p.change)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
