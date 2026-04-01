import { useState } from 'react'
import { Download, Plus, Globe, MessageCircle, Camera, Search as SearchIcon, Users, TrendingUp, Edit, Loader2 } from 'lucide-react'
import { useMarketingMetrics } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'

const periodsMap: Record<string, number> = {
  '7 dias': 7,
  '30 dias': 30,
  '3 meses': 90,
  '12 meses': 365
}

const iconMap: Record<string, any> = {
  'Orgânico (Site)': Globe,
  'WhatsApp': MessageCircle,
  'Instagram': Camera,
  'Google Ads': SearchIcon,
  'Indicação': Users,
}

export default function MarketingPage() {
  const [period, setPeriod] = useState('30 dias')
  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId

  const endDate = new Date().toISOString().split('T')[0]
  const startDateObj = new Date()
  startDateObj.setDate(startDateObj.getDate() - (periodsMap[period] || 30))
  const startDate = startDateObj.toISOString().split('T')[0]

  const { data, isLoading } = useMarketingMetrics(clinicId, startDate, endDate)

  const origins = data?.origins || []
  const campaigns = data?.campaigns || []

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  
  const totalVisitors = 3420 
  const totalAppointments = campaigns.reduce((sum: number, c: any) => sum + (c.appointments || 0), 0)
  const totalCost = campaigns.reduce((sum: number, c: any) => sum + (parseFloat(c.cost?.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0), 0)
  const avgCpa = totalAppointments > 0 ? totalCost / totalAppointments : 0

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Marketing</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="date-presets">
            {Object.keys(periodsMap).map(p => (
              <button 
                key={p} 
                className={`date-preset${period === p ? ' active' : ''}`} 
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Exportar Lista</button>
        </div>
      </div>

      <div className="metrics-row stagger-children">
        <div className="metric-card"><span className="metric-label">Visitantes no Site</span><span className="metric-value">{totalVisitors.toLocaleString()}</span></div>
        <div className="metric-card">
          <span className="metric-label">Contatos Iniciados</span>
          <span className="metric-value">{(totalVisitors * 0.1).toFixed(0)}</span>
          <span className="badge badge-emerald" style={{ alignSelf: 'flex-start' }}>10% conv.</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Agendamentos</span>
          <span className="metric-value">{totalAppointments}</span>
          <span className="badge badge-gold" style={{ alignSelf: 'flex-start' }}>
            {totalVisitors > 0 ? ((totalAppointments / (totalVisitors * 0.1)) * 100).toFixed(1) : 0}% conv.
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Custo por Agendamento</span>
          <span className="metric-value">{formatCurrency(avgCpa)}</span>
          <span className="metric-change positive"><TrendingUp size={12} /> -15%</span>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Origem dos Agendamentos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 'var(--space-6) 0' }}>
            {origins.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados de origem.</p>}
            {origins.map((o: any, i: number) => {
              const Icon = iconMap[o.name] || Globe
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={18} color="var(--color-accent-emerald)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{o.name}</span>
                      <span style={{ fontWeight: 500 }}>{o.value} ({o.pct}%)</span>
                    </div>
                    <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${o.pct}%` }} /></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="chart-card">
          <h3>Funil de Conversão</h3>
          <div className="funnel-container">
            <div className="funnel-step" style={{ width: '100%' }}>
              <span className="funnel-label">Visitantes</span>
              <span className="funnel-value">{totalVisitors.toLocaleString()}</span>
            </div>
            <div className="funnel-step" style={{ width: '65%' }}>
              <span className="funnel-label">Contatos</span>
              <span className="funnel-value">{(totalVisitors * 0.1).toFixed(0)}</span>
            </div>
            <div className="funnel-step" style={{ width: '38%' }}>
              <span className="funnel-label">Agendamentos</span>
              <span className="funnel-value">{totalAppointments}</span>
            </div>
            <div className="funnel-step" style={{ width: '22%' }}>
              <span className="funnel-label">Concluídos</span>
              <span className="funnel-value">{(totalAppointments * 0.9).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700 }}>Campanhas</h3>
          <button className="btn btn-primary btn-sm"><Plus size={14} /> Nova Campanha</button>
        </div>
        <table className="data-table">
          <thead><tr><th>Campanha</th><th>Canal</th><th>Período</th><th>Investimento</th><th>Agendamentos</th><th>CPA</th><th>ROI</th><th></th></tr></thead>
          <tbody>
            {campaigns.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>Nenhuma campanha encontrada.</td></tr>}
            {campaigns.map((c: any, i: number) => (
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
