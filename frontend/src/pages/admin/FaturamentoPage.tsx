import { useState } from 'react'
import { Download, TrendingUp, CreditCard, QrCode, FileText, Smartphone, Banknote, AlertTriangle } from 'lucide-react'

const periods = ['Hoje', '7 dias', '30 dias', '3 meses', '12 meses']

const channels = [
  { name: 'PIX', icon: QrCode, value: 'R$ 42.300', pct: 33 },
  { name: 'Cartão de Crédito', icon: CreditCard, value: 'R$ 38.500', pct: 30 },
  { name: 'Boleto', icon: FileText, value: 'R$ 19.200', pct: 15 },
  { name: 'Convênio', icon: Smartphone, value: 'R$ 22.150', pct: 17 },
  { name: 'Dinheiro', icon: Banknote, value: 'R$ 6.300', pct: 5 },
]

const payouts = [
  { name: 'Dra. Maria Santos', appointments: 145, gross: 'R$ 36.250', pct: '50%', net: 'R$ 18.125' },
  { name: 'Dr. Carlos Mendes', appointments: 89, gross: 'R$ 40.050', pct: '45%', net: 'R$ 18.022' },
  { name: 'Dra. Ana Costa', appointments: 67, gross: 'R$ 13.400', pct: '50%', net: 'R$ 6.700' },
  { name: 'Dr. Pedro Lima', appointments: 48, gross: 'R$ 14.400', pct: '40%', net: 'R$ 5.760' },
]

const delinquent = [
  { patient: 'Roberto Silva', service: 'Check-Up', value: 'R$ 890,00', date: '15/03/2026', days: 13 },
  { patient: 'Camila Souza', service: 'Consulta Neuro', value: 'R$ 450,00', date: '20/03/2026', days: 8 },
]

export default function FaturamentoPage() {
  const [period, setPeriod] = useState('30 dias')

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Faturamento</h2>
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
        <div className="metric-card"><span className="metric-label">Receita Bruta</span><span className="metric-value">R$ 128.450</span><span className="metric-change positive"><TrendingUp size={12} /> +12%</span></div>
        <div className="metric-card"><span className="metric-label">Deduções</span><span className="metric-value" style={{ color: 'var(--color-accent-danger)' }}>-R$ 4.200</span><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Estornos + Taxas</span></div>
        <div className="metric-card"><span className="metric-label">Receita Líquida</span><span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>R$ 124.250</span></div>
        <div className="metric-card"><span className="metric-label">Projeção do Mês</span><span className="metric-value">R$ 142.000</span><span className="badge badge-gold" style={{ alignSelf: 'flex-start' }}>Base: agenda confirmada</span></div>
      </div>

      {/* Revenue by Channel */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Receita por Canal de Pagamento</h3>
          <div className="chart-placeholder" style={{ flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 12, padding: 'var(--space-6)' }}>
            {channels.map((ch, i) => {
              const Icon = ch.icon
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={18} color="var(--color-accent-gold)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{ch.name}</span>
                      <span style={{ fontWeight: 500 }}>{ch.value} ({ch.pct}%)</span>
                    </div>
                    <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${ch.pct * 2.5}%`, background: i === 0 ? 'var(--color-accent-emerald)' : i === 1 ? 'var(--color-accent-gold)' : undefined }} /></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="chart-card">
          <h3>Faturamento Diário</h3>
          <div className="chart-placeholder">
            {[4200, 3800, 5200, 4800, 6100, 3200, 0, 5500, 4900, 5800, 5100, 4300].map((v, i) => (
              <div key={i} className="bar" style={{ height: `${(v / 70)}px` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Payouts */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Repasses por Profissional</h3>
        <table className="data-table">
          <thead><tr><th>Profissional</th><th>Atendimentos</th><th>Receita Bruta</th><th>Comissão</th><th>Repasse</th></tr></thead>
          <tbody>
            {payouts.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td>{p.appointments}</td>
                <td>{p.gross}</td>
                <td><span className="badge badge-gold">{p.pct}</span></td>
                <td style={{ fontWeight: 700, color: 'var(--color-accent-emerald)' }}>{p.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delinquency */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          <AlertTriangle size={18} color="var(--color-accent-danger)" />
          Inadimplência
        </h3>
        {delinquent.map((d, i) => (
          <div key={i} className="alert-row urgent" style={{ marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{d.patient}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{d.service} • Emitido em {d.date} • {d.days} dias em atraso</div>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--color-accent-danger)' }}>{d.value}</span>
            <button className="btn btn-ghost btn-sm">Reenviar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
