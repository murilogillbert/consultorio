import { useState } from 'react'
import { Download, TrendingUp, TrendingDown, Clock } from 'lucide-react'

const periods = ['Hoje', '7 dias', '30 dias', '3 meses', '12 meses']
const services = [
  { name: 'Consulta Clínica Geral', count: 145, revenue: 'R$ 36.250', growth: +15, topPro: 'Dra. Maria Santos', peakHour: '09:00-10:00', cancelRate: '5%', margin: '72%' },
  { name: 'Check-Up Cardiológico', count: 89, revenue: 'R$ 79.210', growth: +22, topPro: 'Dra. Maria Santos', peakHour: '08:00-09:00', cancelRate: '3%', margin: '68%' },
  { name: 'Consulta Neurológica', count: 67, revenue: 'R$ 30.150', growth: -3, topPro: 'Dr. Carlos Mendes', peakHour: '14:00-15:00', cancelRate: '8%', margin: '75%' },
  { name: 'Exame Oftalmológico', count: 54, revenue: 'R$ 10.800', growth: -12, topPro: 'Dra. Ana Costa', peakHour: '10:00-11:00', cancelRate: '4%', margin: '80%' },
  { name: 'Fisioterapia', count: 48, revenue: 'R$ 8.640', growth: +8, topPro: 'Dr. Pedro Lima', peakHour: '15:00-16:00', cancelRate: '6%', margin: '65%' },
]

export default function MetricasServicosPage() {
  const [period, setPeriod] = useState('30 dias')

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Métricas de Serviços</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="date-presets">
            {periods.map(p => (<button key={p} className={`date-preset${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>))}
          </div>
          <div className="export-btns">
            <button className="btn btn-secondary btn-sm"><Download size={14} /> CSV</button>
            <button className="btn btn-secondary btn-sm"><Download size={14} /> PDF</button>
          </div>
        </div>
      </div>

      <div className="metrics-row stagger-children">
        <div className="metric-card"><span className="metric-label">Total Realizações</span><span className="metric-value">403</span></div>
        <div className="metric-card"><span className="metric-label">Receita Total</span><span className="metric-value">R$ 165.050</span></div>
        <div className="metric-card"><span className="metric-label">taxa de Cancelamento</span><span className="metric-value" style={{ color: 'var(--color-accent-danger)' }}>5,2%</span></div>
        <div className="metric-card"><span className="metric-label">Margem Média</span><span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>72%</span></div>
      </div>

      {/* Peak Hours Chart */}
      <div className="charts-row">
        <div className="chart-card">
          <h3><Clock size={16} style={{ display: 'inline', marginRight: 8 }} />Horários de Pico</h3>
          <div className="chart-placeholder">
            {[30, 65, 90, 85, 70, 45, 20, 55, 80, 75, 50, 25].map((h, i) => (
              <div key={i} className="bar" style={{ height: `${h * 2}px`, background: h > 80 ? 'var(--color-accent-gold)' : 'var(--color-accent-emerald)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
            <span>07h</span><span>08h</span><span>09h</span><span>10h</span><span>11h</span><span>12h</span><span>13h</span><span>14h</span><span>15h</span><span>16h</span><span>17h</span><span>18h</span>
          </div>
        </div>
        <div className="chart-card">
          <h3>Margem por Serviço</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {services.map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{s.name}</span><span style={{ fontWeight: 500, color: 'var(--color-accent-emerald)' }}>{s.margin}</span>
                </div>
                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: s.margin }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>Serviço</th><th>Realizações</th><th>Receita</th><th>Crescimento</th><th>Top Profissional</th><th>Pico</th><th>Cancelamento</th><th>Margem</th></tr></thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{s.name}</td>
                <td>{s.count}</td>
                <td style={{ color: 'var(--color-accent-gold)', fontWeight: 500 }}>{s.revenue}</td>
                <td><span className={`metric-change ${s.growth >= 0 ? 'positive' : 'negative'}`}>{s.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(s.growth)}%</span></td>
                <td style={{ fontSize: 13 }}>{s.topPro}</td>
                <td style={{ fontSize: 13 }}>{s.peakHour}</td>
                <td><span className="badge badge-danger">{s.cancelRate}</span></td>
                <td style={{ fontWeight: 500 }}>{s.margin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
