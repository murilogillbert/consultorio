import { useState } from 'react'
import { TrendingUp, TrendingDown, Bell, Send, Bold, Italic, Link2, Upload, Trash2, RefreshCw, BarChart3, AlertTriangle } from 'lucide-react'
import { useAppointments } from '../../hooks/useAppointments'
import { useDashboardMetrics } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'

const publishedAvisos = [
  { title: 'Novo protocolo de higienização', urgency: 'important', date: '27/03/2026', readRate: { read: 12, total: 15 } },
  { title: 'Confraternização da equipe', urgency: 'normal', date: '25/03/2026', readRate: { read: 15, total: 15 } },
  { title: 'Manutenção programada', urgency: 'urgent', date: '24/03/2026', readRate: { read: 8, total: 15 } },
]

export default function DashboardPage() {
  const [urgency, setUrgency] = useState('normal')
  const [aviso, setAviso] = useState('')

  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId

  // Fetch this month's appointments and dash KPIs
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const { data: monthAppointments = [] } = useAppointments(monthStart + 'T00:00:00', monthEnd + 'T23:59:59')
  const { data: dashData, isLoading } = useDashboardMetrics(clinicId)

  const totalAppointments = dashData?.metrics.totalAgendamentos || monthAppointments.length
  const completedAppointments = dashData?.metrics.concluidosAgendamentos || monthAppointments.filter(a => a.status === 'COMPLETED').length
  const completionRate = dashData?.metrics.taxaOcupacao || (totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0)

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  
  if (isLoading) {
    return (
      <div className="animate-fade-in" style={{ padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Carregando dados operacionais do painel...</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Announcement Publisher */}
      <div className="announcement-publisher">
        <h3>
          <Bell size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: 'var(--color-accent-gold)' }} />
          Publicar Aviso
        </h3>

        <div className="editor-toolbar">
          <button title="Negrito"><Bold size={16} /></button>
          <button title="Itálico"><Italic size={16} /></button>
          <button title="Link"><Link2 size={16} /></button>
          <button title="Anexo"><Upload size={16} /></button>
        </div>

        <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
          <input className="input-field" placeholder="Título do aviso" style={{ fontWeight: 500 }} />
        </div>

        <textarea
          className="input-field"
          placeholder="Escreva o aviso para a equipe..."
          value={aviso}
          onChange={e => setAviso(e.target.value)}
          style={{ minHeight: 100, marginBottom: 'var(--space-4)' }}
        />

        <div className="publisher-controls">
          <select className="input-field" style={{ width: 200 }}>
            <option>Todos os funcionários</option>
            <option>Somente Recepção</option>
            <option>Somente Profissionais</option>
            <option>Selecionar pessoas...</option>
          </select>

          <input type="date" className="input-field" style={{ width: 'auto' }} placeholder="Data de expiração" />

          <div className="urgency-selector">
            {[
              { v: 'normal', l: 'Normal' },
              { v: 'important', l: 'Importante' },
              { v: 'urgent', l: 'Urgente' },
            ].map(u => (
              <button key={u.v} className={`urgency-pill ${u.v}${urgency === u.v ? ' selected' : ''}`}
                onClick={() => setUrgency(u.v)}>
                {u.l}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            <Send size={16} /> Publicar
          </button>
        </div>

        {/* Published list */}
        <div className="announcement-published-list">
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 'var(--space-3)', marginTop: 'var(--space-4)' }}>Avisos Publicados</h4>
          {publishedAvisos.map((a, i) => (
            <div key={i} className="published-announcement">
              <div className={`announcement-urgency ${a.urgency}`} style={{ width: 4, height: 32, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{a.date}</div>
              </div>
              <div className="read-rate" style={{ width: 160 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  {a.readRate.read} de {a.readRate.total} leram
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(a.readRate.read / a.readRate.total) * 100}%` }} />
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" title="Reenviar">
                <RefreshCw size={13} />
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent-danger)' }} title="Arquivar">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Executive Metrics */}
      <div className="metrics-row stagger-children">
        <div className="metric-card">
          <span className="metric-label">Faturamento do Mês</span>
          <span className="metric-value">{formatCurrency(dashData?.metrics.faturamentoMes || 0)}</span>
          {(dashData?.metrics.faturamentoMudanca !== undefined) && (
            <span className={`metric-change ${dashData.metrics.faturamentoMudanca >= 0 ? 'positive' : 'negative'}`} style={dashData.metrics.faturamentoMudanca < 0 ? { color: 'var(--color-accent-danger)' } : {}}>
              {dashData.metrics.faturamentoMudanca >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} 
              {dashData.metrics.faturamentoMudanca > 0 ? '+' : ''}{dashData.metrics.faturamentoMudanca.toFixed(1)}% vs mês anterior
            </span>
          )}
        </div>
        <div className="metric-card">
          <span className="metric-label">Agendamentos / Concluídos</span>
          <span className="metric-value">{totalAppointments} / {completedAppointments}</span>
          <span className="badge badge-emerald" style={{ alignSelf: 'flex-start' }}>{completionRate}% taxa conclusões</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Taxa de Ocupação</span>
          <span className="metric-value">{completionRate}%</span>
          <span className="metric-change positive">
            Métrica estipulada via agendamentos criados
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">NPS Médio</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>{dashData?.metrics.npsMedio || 'N/A'}</span>
          <span className="badge badge-emerald" style={{ alignSelf: 'flex-start' }}>Geral da Clínica</span>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Faturamento — Últimos 12 Meses</h3>
          <div className="chart-placeholder">
            {dashData?.charts.faturamentoAnual.map((h, i) => {
              const maxRev = Math.max(...dashData.charts.faturamentoAnual.map(d => d.revenue)) || 1
              const heightPct = (h.revenue / maxRev) * 100
              const isZero = h.revenue === 0
              return (
                <div key={i} className="bar-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, margin: '0 2px' }}>
                  <div title={`${h.month}: ${formatCurrency(h.revenue)}`} style={{ minHeight: isZero ? 2 : `${heightPct}%`, background: isZero ? 'var(--color-text-muted)' : 'var(--color-accent-brand)', borderRadius: '4px 4px 0 0', opacity: i === 11 ? 1 : 0.7, transition: 'height 0.3s ease' }} />
                  <span style={{ fontSize: 10, marginTop: 4, color: 'var(--color-text-muted)', textAlign: 'center' }}>{h.month}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="chart-card">
          <h3>Top 5 Serviços</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {!dashData?.charts.topServices.length && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Métrica vazia.</p>}
            {dashData?.charts.topServices.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 20, fontSize: 14, fontWeight: 700, color: 'var(--color-accent-gold)' }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.count} realizações</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-accent-gold)' }}>{formatCurrency(s.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strategic Alerts */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
          <AlertTriangle size={18} color="var(--color-accent-warning)" />
          Alertas Estratégicos
        </h3>
        <div className="alerts-list">
          {dashData?.alertas.map((a, i) => (
            <div key={i} className="alert-row">
              {a.type === 'danger' && <TrendingDown size={16} color="var(--color-accent-danger)" />}
              {a.type === 'warning' && <AlertTriangle size={16} color="var(--color-accent-warning)" />}
              {a.type === 'success' && <BarChart3 size={16} color="var(--color-accent-emerald)" />}
              <span className="alert-text">{a.text}</span>
              <button className="btn btn-ghost btn-sm">{a.action}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
