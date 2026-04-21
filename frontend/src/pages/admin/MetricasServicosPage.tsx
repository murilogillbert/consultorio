import { useState } from 'react'
import { Download, Clock, TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, Users, AlertTriangle, XCircle, CheckCircle, ArrowUpRight } from 'lucide-react'
import { useServiceMetrics, type ServiceMetric } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'
import { downloadTextFile, handleExportClick, openPrintableReport } from '../../utils/exportReport'

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

function StatusBadge({ status }: { status: ServiceMetric['status'] }) {
  const config = {
    em_alta: { label: 'Em alta', className: 'badge badge-emerald', icon: <ArrowUpRight size={11} /> },
    estavel: { label: 'Estável', className: 'badge badge-gold', icon: null },
    atencao: { label: 'Atenção', className: 'badge badge-warning', icon: <AlertTriangle size={11} /> },
    declinio: { label: 'Declínio', className: 'badge badge-danger', icon: <XCircle size={11} /> },
  }
  const c = config[status] || config.estavel
  return <span className={c.className} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{c.icon}{c.label}</span>
}

export default function MetricasServicosPage() {
  const [period, setPeriod] = useState('30 dias')
  const { user } = useAuth()
  const clinicId = user?.clinicId
  const { data, isLoading, error } = useServiceMetrics(clinicId, undefined, undefined, period)
  const services = data?.services || []
  const peakHours = data?.peakHours || []

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  if (isLoading) return <div style={{ padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Carregando métricas...</div>
  if (error) return <div style={{ padding: 'var(--space-8)', color: 'var(--color-accent-danger)' }}>Erro ao carregar métricas de serviços: {(error as any)?.response?.data?.detail ?? (error as any)?.message}</div>

  // Agregações globais
  const totalCompleted = services.reduce((s, sv) => s + sv.completedCount, 0)
  const totalAll = services.reduce((s, sv) => s + sv.totalAppointments, 0)
  const totalCancelled = services.reduce((s, sv) => s + sv.cancelledCount + sv.noShowCount, 0)
  const totalCancelledByPatient = services.reduce((s, sv) => s + (sv.cancelledByPatientCount || 0), 0)
  const totalCancelledByReception = services.reduce((s, sv) => s + (sv.cancelledByReceptionCount || 0), 0)
  const totalRevenue = services.reduce((s, sv) => s + sv.revenue, 0)
  const avgCancellation = totalAll > 0 ? Math.round((totalCancelled / totalAll) * 100) : 0
  const totalUniquePatients = services.reduce((s, sv) => s + sv.uniquePatients, 0)
  const avgInsurancePct = services.length > 0 ? Math.round(services.reduce((s, sv) => s + sv.insurancePct, 0) / services.length) : 0
  const avgRevenuePerHour = services.length > 0 ? Math.round(services.reduce((s, sv) => s + sv.revenuePerHour, 0) / services.length) : 0
  const peakTotal = peakHours.reduce((sum, h) => sum + h.count, 0)
  const peakAverage = peakHours.length > 0 ? peakTotal / peakHours.length : 0
  const peakMax = peakHours.reduce((best, h) => (h.count > best.count ? h : best), peakHours[0] || { hour: '--:--', count: 0 })
  const peakMin = peakHours.reduce((worst, h) => (h.count < worst.count ? h : worst), peakHours[0] || { hour: '--:--', count: 0 })
  const peakTop = [...peakHours].sort((a, b) => b.count - a.count).slice(0, 3)

  const sorted = [...services].sort((a, b) => b.revenue - a.revenue)
  const topService = sorted[0]
  const exportRows = sorted.map((s, i) => ({
    Ranking: i + 1,
    Servico: s.name,
    Categoria: s.category,
    DuracaoMin: s.duration,
    Agendamentos: s.totalAppointments,
    Concluidos: s.completedCount,
    Cancelados: s.cancelledCount,
    NoShow: s.noShowCount,
    Receita: s.revenue,
    TicketMedio: s.avgPrice,
    CancelamentoPct: s.cancellationRate,
    PacientesUnicos: s.uniquePatients,
    PacientesRetorno: s.returningPatients,
    RetornoPct: s.returnRate,
    ConvenioPct: s.insurancePct,
    ReceitaPorHora: s.revenuePerHour,
    Profissionais: s.proCount,
    ProfissionalMaisFrequente: s.topProfessional,
    TendenciaReceitaPct: s.revenueTrend,
    Status: s.status,
  }))
  const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const downloadCsv = () => {
    const headers = Object.keys(exportRows[0] || { Relatorio: 'Sem dados' })
    const rows = exportRows.length > 0 ? exportRows : [{ Relatorio: 'Sem dados' }]
    const csv = [headers.join(';'), ...rows.map(row => headers.map(h => csvEscape((row as any)[h])).join(';'))].join('\n')
    downloadTextFile(`metricas-servicos-${period.replace(/\s+/g, '-').toLowerCase()}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8;')
  }
  const openPdf = () => {
    const rows = sorted.map((s, i) => `
      <tr>
        <td>${i + 1}</td><td>${s.name}</td><td>${s.completedCount}/${s.totalAppointments}</td>
        <td>${fmt(s.revenue)}</td><td>${fmt(s.avgPrice)}</td><td>${s.cancellationRate}%</td>
        <td>${s.uniquePatients}</td><td>${s.returnRate}%</td><td>${fmt(s.revenuePerHour)}</td><td>${s.status}</td>
      </tr>
    `).join('')
    openPrintableReport(`metricas-servicos-${period.replace(/\s+/g, '-').toLowerCase()}.pdf`, `
      <html><head><title>Métricas de Serviços</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#1f2937} h1{font-size:22px;margin:0 0 4px}
        .meta{color:#6b7280;margin-bottom:18px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
        .card{border:1px solid #ddd;padding:10px;border-radius:6px}.label{font-size:11px;color:#6b7280}.value{font-size:18px;font-weight:700}
        table{width:100%;border-collapse:collapse;font-size:11px} th,td{border:1px solid #ddd;padding:6px;text-align:left} th{background:#f3f4f6}
      </style></head><body>
      <h1>Métricas de Serviços</h1><div class="meta">Período: ${period}</div>
      <div class="cards">
        <div class="card"><div class="label">Concluídos</div><div class="value">${totalCompleted}</div></div>
        <div class="card"><div class="label">Receita Total</div><div class="value">${fmt(totalRevenue)}</div></div>
        <div class="card"><div class="label">Mais Rentável</div><div class="value">${topService?.name || '-'}</div></div>
        <div class="card"><div class="label">R$/Hora Médio</div><div class="value">${fmt(avgRevenuePerHour)}</div></div>
      </div>
      <table><thead><tr><th>#</th><th>Serviço</th><th>Concl./Agend.</th><th>Receita</th><th>Ticket</th><th>Cancel.</th><th>Pacientes</th><th>Retorno</th><th>R$/Hora</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="10">Sem dados</td></tr>'}</tbody></table>
      <script>window.onload=()=>{window.print()}</script></body></html>
    `)
  }

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Métricas de Serviços</h2>
        <div className="metrics-header-actions">
          <div className="date-presets">
            {periods.map(p => (
              <button key={p} className={`date-preset${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <div className="export-btns">
            <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => handleExportClick(e, downloadCsv)}><Download size={14} /> CSV</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => handleExportClick(e, openPdf)}><Download size={14} /> PDF</button>
          </div>
        </div>
      </div>

      {/* Cards - Linha 1 */}
      <div className="metrics-row stagger-children">
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> Total Concluídos</span>
          <span className="metric-value">{totalCompleted}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>de {totalAll} agendados</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} /> Receita Total</span>
          <span className="metric-value">{fmt(totalRevenue)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Ticket médio: {fmt(totalCompleted > 0 ? totalRevenue / totalCompleted : 0)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={14} /> Tx. Cancelamento</span>
          <span className="metric-value" style={{ color: avgCancellation > 20 ? 'var(--color-accent-danger)' : avgCancellation > 10 ? 'var(--color-accent-gold)' : 'var(--color-accent-emerald)' }}>
            {avgCancellation}%
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{totalCancelled} cancelamentos/ausências</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Paciente: {totalCancelledByPatient} · Recepção: {totalCancelledByReception}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> Serviços Ativos</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>{services.length}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>com agendamentos</span>
        </div>
      </div>

      {/* Cards - Linha 2 */}
      <div className="metrics-row stagger-children" style={{ marginTop: 'var(--space-4)' }}>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} /> Mais Rentável</span>
          <span className="metric-value" style={{ fontSize: 18 }}>{topService?.name?.substring(0, 25) || '—'}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{topService ? fmt(topService.revenue) : '—'}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} /> R$/Hora Médio</span>
          <span className="metric-value">{fmt(avgRevenuePerHour)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>receita por hora de serviço</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Pacientes Únicos</span>
          <span className="metric-value">{totalUniquePatients}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>no período</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Convênio</span>
          <span className="metric-value">{avgInsurancePct}%</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>vs. {100 - avgInsurancePct}% particular</span>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-row" style={{ marginTop: 'var(--space-6)' }}>
        <div className="chart-card">
          <h3><Clock size={16} style={{ display: 'inline', marginRight: 8 }} />Horários de Pico</h3>
          <div className="admin-grid-3 admin-grid-compact">
            <div className="metric-card" style={{ padding: 12, minHeight: 'auto' }}>
              <span className="metric-label">Total no período</span>
              <span className="metric-value" style={{ fontSize: 20 }}>{peakTotal}</span>
            </div>
            <div className="metric-card" style={{ padding: 12, minHeight: 'auto' }}>
              <span className="metric-label">Média por faixa</span>
              <span className="metric-value" style={{ fontSize: 20 }}>{peakAverage.toFixed(1)}</span>
            </div>
            <div className="metric-card" style={{ padding: 12, minHeight: 'auto' }}>
              <span className="metric-label">Pico mais forte</span>
              <span className="metric-value" style={{ fontSize: 20 }}>{peakMax.hour}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{peakMax.count} atendimentos</span>
            </div>
          </div>
          <div className="chart-placeholder" style={{ position: 'relative', minHeight: 240, alignItems: 'flex-end', paddingTop: 24 }}>
            {peakHours.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', width: '100%' }}>Sem dados de pico.</p>}
            {peakHours.length > 0 && (
              <>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${100 - (peakAverage / (Math.max(...peakHours.map(ph => ph.count)) || 1)) * 100}%`,
                  borderTop: '1px dashed var(--color-text-muted)',
                  opacity: 0.7,
                  pointerEvents: 'none'
                }} />
                <span style={{
                  position: 'absolute',
                  right: 0,
                  top: `${Math.max(0, 100 - (peakAverage / (Math.max(...peakHours.map(ph => ph.count)) || 1)) * 100) - 2}%`,
                  fontSize: 10,
                  color: 'var(--color-text-muted)',
                  background: 'var(--color-surface)',
                  padding: '0 4px'
                }}>
                  média {peakAverage.toFixed(1)}
                </span>
              </>
            )}
            {peakHours.map((h: any, i: number) => {
              const maxCount = Math.max(...peakHours.map((ph: any) => ph.count)) || 1
              const height = (h.count / maxCount) * 100
              const isTop = peakTop.some(t => t.hour === h.hour)
              const isLast = i === peakHours.length - 1
              return (
                <div key={i} className="bar-wrapper" title={`${h.hour}: ${h.count} atendimentos`}>
                  <div
                    className="bar"
                    style={{
                      height: `${Math.max(height + 5, 3)}%`,
                      background: isTop ? 'var(--color-accent-gold)' : 'var(--color-accent-emerald)',
                      boxShadow: isTop ? '0 0 0 1px rgba(0,0,0,0.06)' : 'none',
                    }}
                  />
                  <span style={{ fontSize: 10, marginTop: 4, color: isLast || i % 2 === 0 ? 'var(--color-text-muted)' : 'transparent' }}>
                    {h.hour.split(':')[0]}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
            <span>Top 3: {peakTop.map(t => `${t.hour} (${t.count})`).join(' · ') || '—'}</span>
            <span>Menor faixa: {peakMin.hour} ({peakMin.count})</span>
          </div>
        </div>
        <div className="chart-card">
          <h3>Receita por Serviço</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {services.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados.</p>}
            {sorted.slice(0, 6).map((s, i) => {
              const maxRev = sorted[0]?.revenue || 1
              const pct = (s.revenue / maxRev) * 100
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s.name}
                      <TrendBadge value={s.revenueTrend} />
                    </span>
                    <span style={{ fontWeight: 500 }}>{fmt(s.revenue)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--color-accent-gold)' }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card admin-table-card" style={{ padding: 0, marginTop: 'var(--space-6)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Serviço</th>
              <th>Realizações</th>
              <th>Receita</th>
              <th>Ticket Médio</th>
              <th>Cancelamento</th>
              <th>Pacientes</th>
              <th>Retorno</th>
              <th>Duração Real</th>
              <th>R$/Hora</th>
              <th>Tendência</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && <tr><td colSpan={12} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>Nenhum serviço registrado no período.</td></tr>}
            {sorted.map((s, i) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 700, color: 'var(--color-accent-gold)' }}>{i + 1}</td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.category} · {s.duration}min · {s.proCount} prof.</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{s.completedCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>de {s.totalAppointments}</div>
                </td>
                <td style={{ fontWeight: 500, color: 'var(--color-accent-gold)' }}>{fmt(s.revenue)}</td>
                <td>{fmt(s.avgPrice)}</td>
                <td>
                  <span style={{
                    fontWeight: 600, fontSize: 13,
                    color: s.cancellationRate > 20 ? 'var(--color-accent-danger)' : s.cancellationRate > 10 ? 'var(--color-accent-gold)' : 'var(--color-accent-emerald)'
                  }}>
                    {s.cancellationRate}%
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.cancelledCount + s.noShowCount} total</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>P: {s.cancelledByPatientCount || 0} · R: {s.cancelledByReceptionCount || 0}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{s.uniquePatients}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.insurancePct}% convênio</div>
                </td>
                <td>
                  <span style={{ fontWeight: 600, fontSize: 13, color: s.returnRate > 30 ? 'var(--color-accent-emerald)' : 'var(--color-text-secondary)' }}>
                    {s.returnRate}%
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.returningPatients} pac.</div>
                </td>
                <td>
                  <div style={{ fontSize: 13 }}>
                    <span style={{
                      fontWeight: 500,
                      color: s.avgRealDuration > s.duration * 1.15 ? 'var(--color-accent-danger)' : s.avgRealDuration < s.duration * 0.85 ? 'var(--color-accent-gold)' : 'var(--color-accent-emerald)'
                    }}>
                      {s.avgRealDuration}min
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>plan. {s.duration}min</div>
                </td>
                <td style={{ fontWeight: 500 }}>{fmt(s.revenuePerHour)}</td>
                <td>
                  <TrendBadge value={s.revenueTrend} />
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>receita</div>
                </td>
                <td><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
