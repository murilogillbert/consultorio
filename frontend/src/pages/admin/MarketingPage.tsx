import { useState } from 'react'
import { Download, Plus, Globe, MessageCircle, Camera, Search as SearchIcon, Users, TrendingUp, Edit } from 'lucide-react'

const periods = ['7 dias', '30 dias', '3 meses', '12 meses']

const origins = [
  { name: 'Orgânico (Site)', value: 120, pct: 35, icon: Globe },
  { name: 'WhatsApp', value: 95, pct: 28, icon: MessageCircle },
  { name: 'Instagram', value: 55, pct: 16, icon: Camera },
  { name: 'Google Ads', value: 42, pct: 12, icon: SearchIcon },
  { name: 'Indicação', value: 30, pct: 9, icon: Users },
]

const campaigns = [
  { name: 'Campanha Check-Up Março', channel: 'Instagram Ads', period: '01/03–31/03', cost: 'R$ 2.500', appointments: 32, cpa: 'R$ 78', roi: '+215%' },
  { name: 'Google Ads — Cardiologia', channel: 'Google Ads', period: '15/02–15/03', cost: 'R$ 1.800', appointments: 18, cpa: 'R$ 100', roi: '+180%' },
  { name: 'Promoção Oftalmologia', channel: 'WhatsApp Broadcast', period: '01/03–15/03', cost: 'R$ 0', appointments: 12, cpa: 'R$ 0', roi: '∞' },
]

export default function MarketingPage() {
  const [period, setPeriod] = useState('30 dias')

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Marketing</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="date-presets">
            {periods.map(p => (<button key={p} className={`date-preset${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>))}
          </div>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Exportar Lista</button>
        </div>
      </div>

      <div className="metrics-row stagger-children">
        <div className="metric-card"><span className="metric-label">Visitantes no Site</span><span className="metric-value">3.420</span></div>
        <div className="metric-card"><span className="metric-label">Contatos Iniciados</span><span className="metric-value">342</span><span className="badge badge-emerald" style={{ alignSelf: 'flex-start' }}>10% conv.</span></div>
        <div className="metric-card"><span className="metric-label">Agendamentos</span><span className="metric-value">198</span><span className="badge badge-gold" style={{ alignSelf: 'flex-start' }}>57.9% conv.</span></div>
        <div className="metric-card"><span className="metric-label">Custo por Agendamento</span><span className="metric-value">R$ 21,70</span><span className="metric-change positive"><TrendingUp size={12} /> -15%</span></div>
      </div>

      <div className="charts-row">
        {/* Origin Chart */}
        <div className="chart-card">
          <h3>Origem dos Agendamentos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 'var(--space-6) 0' }}>
            {origins.map((o, i) => {
              const Icon = o.icon
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={18} color="var(--color-accent-emerald)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{o.name}</span>
                      <span style={{ fontWeight: 500 }}>{o.value} ({o.pct}%)</span>
                    </div>
                    <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${o.pct * 2.5}%` }} /></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="chart-card">
          <h3>Funil de Conversão</h3>
          <div className="funnel-container">
            <div className="funnel-step" style={{ width: '100%' }}>
              <span className="funnel-label">Visitantes</span>
              <span className="funnel-value">3.420</span>
            </div>
            <div className="funnel-step" style={{ width: '65%' }}>
              <span className="funnel-label">Contatos</span>
              <span className="funnel-value">342</span>
            </div>
            <div className="funnel-step" style={{ width: '38%' }}>
              <span className="funnel-label">Agendamentos</span>
              <span className="funnel-value">198</span>
            </div>
            <div className="funnel-step" style={{ width: '22%' }}>
              <span className="funnel-label">Concluídos</span>
              <span className="funnel-value">182</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700 }}>Campanhas</h3>
          <button className="btn btn-primary btn-sm"><Plus size={14} /> Nova Campanha</button>
        </div>
        <table className="data-table">
          <thead><tr><th>Campanha</th><th>Canal</th><th>Período</th><th>Investimento</th><th>Agendamentos</th><th>CPA</th><th>ROI</th><th></th></tr></thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><span className="badge badge-gold">{c.channel}</span></td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{c.period}</td>
                <td>{c.cost}</td>
                <td style={{ fontWeight: 500 }}>{c.appointments}</td>
                <td>{c.cpa}</td>
                <td style={{ fontWeight: 700, color: 'var(--color-accent-emerald)' }}>{c.roi}</td>
                <td><button className="btn btn-icon btn-sm"><Edit size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
