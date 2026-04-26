import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Download, DollarSign, CreditCard, AlertTriangle, Users, CheckCircle, BarChart3, Receipt, Building2 } from 'lucide-react'
import { useBillingData } from '../../hooks/useDashboard'
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

export default function FaturamentoPage() {
  const [period, setPeriod] = useState('30 dias')
  const { user } = useAuth()
  const clinicId = user?.clinicId
  const { data, isLoading } = useBillingData(clinicId, undefined, undefined, period)

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  if (isLoading) return <div style={{ padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Carregando dados financeiros...</div>

  const totalRevenue = data?.totalRevenue || 0
  const totalPayout = data?.totalPayout || 0
  const totalCustos = data?.totalCustos || 0
  const custosCount = data?.custosCount || 0
  const platformCommission = data?.platformCommission || 0
  const commissionPct = data?.commissionPct || 0
  const commissionPromoActive = data?.commissionPromoActive ?? false
  const receitaLiquida = data?.receitaLiquida || 0
  const margemLiquida = data?.margemLiquida ?? (totalRevenue > 0 ? Math.round((receitaLiquida / totalRevenue) * 100) : 0)
  const revenueTrend = data?.revenueTrend || 0
  const totalAppointments = data?.totalAppointments || 0
  const completedAppts = data?.completedAppts || 0
  const ticketMedio = data?.ticketMedio || 0
  const totalDelinquency = data?.totalDelinquency || 0
  const revenueByChannel = data?.revenueByChannel || []
  const custosByCategory = data?.custosByCategory || []
  const payouts = data?.payouts || []
  const delinquency = data?.delinquency || []
  const monthlyRevenue = data?.monthlyRevenue || []
  const emptyMonth = { month: '--', revenue: 0, payout: 0, custos: 0, commission: 0, netRevenue: 0 }
  const monthlyTotal = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0)
  const monthlyAverage = monthlyRevenue.length > 0 ? monthlyTotal / monthlyRevenue.length : 0
  const bestMonth = monthlyRevenue.reduce((best, m) => (m.revenue > best.revenue ? m : best), monthlyRevenue[0] || emptyMonth)
  const worstMonth = monthlyRevenue.reduce((worst, m) => (m.revenue < worst.revenue ? m : worst), monthlyRevenue[0] || emptyMonth)
  const latestMonth = monthlyRevenue[monthlyRevenue.length - 1]
  const latestVsAverage = monthlyAverage > 0 && latestMonth ? Math.round((latestMonth.revenue / monthlyAverage - 1) * 100) : 0
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(d => d.revenue)) || 1
  const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const downloadCsv = () => {
    const summaryRows = [
      { Indicador: 'Receita Bruta', Valor: totalRevenue },
      { Indicador: 'Repasses', Valor: totalPayout },
      { Indicador: 'Custos', Valor: totalCustos },
      { Indicador: 'Comissao Plataforma', Valor: platformCommission },
      { Indicador: 'Receita Liquida', Valor: receitaLiquida },
      { Indicador: 'Margem Liquida (%)', Valor: margemLiquida },
      { Indicador: 'Atendimentos', Valor: totalAppointments },
      { Indicador: 'Concluidos', Valor: completedAppts },
      { Indicador: 'Ticket Medio', Valor: ticketMedio },
      { Indicador: 'Inadimplencia', Valor: totalDelinquency },
    ]
    const payoutRows = payouts.map(p => ({
      Profissional: p.name,
      Especialidade: p.specialty,
      Atendimentos: p.appointments,
      ReceitaBruta: p.gross,
      Comissao: p.pct,
      Repasse: p.net,
    }))
    const sections = [
      'Resumo',
      'Indicador;Valor',
      ...summaryRows.map(r => `${csvEscape(r.Indicador)};${csvEscape(r.Valor)}`),
      '',
      'Repasses',
      'Profissional;Especialidade;Atendimentos;ReceitaBruta;Comissao;Repasse',
      ...payoutRows.map(r => `${csvEscape(r.Profissional)};${csvEscape(r.Especialidade)};${csvEscape(r.Atendimentos)};${csvEscape(r.ReceitaBruta)};${csvEscape(r.Comissao)};${csvEscape(r.Repasse)}`),
      '',
      'Receita por Canal',
      'Canal;Valor',
      ...revenueByChannel.map(r => `${csvEscape(r.name)};${csvEscape(r.value)}`),
      '',
      'Custos por Categoria',
      'Categoria;Quantidade;Valor',
      ...custosByCategory.map(c => `${csvEscape(c.name)};${csvEscape(c.count)};${csvEscape(c.value)}`),
    ].join('\n')
    downloadTextFile(`faturamento-${period.replace(/\s+/g, '-').toLowerCase()}.csv`, `\uFEFF${sections}`, 'text/csv;charset=utf-8;')
  }
  const openPdf = () => {
    const payoutRows = payouts.map(p => `<tr><td>${p.name}</td><td>${p.appointments}</td><td>${fmt(p.gross)}</td><td>${p.pct}</td><td>${fmt(p.net)}</td></tr>`).join('')
    const channelRows = revenueByChannel.map(ch => `<tr><td>${ch.name}</td><td>${fmt(ch.value)}</td></tr>`).join('')
    const custoRows = custosByCategory.map(c => `<tr><td>${c.name}</td><td>${c.count}</td><td>${fmt(c.value)}</td></tr>`).join('')
    openPrintableReport(`faturamento-${period.replace(/\s+/g, '-').toLowerCase()}.pdf`, `
      <html><head><title>Faturamento</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#1f2937} h1{font-size:22px;margin:0 0 4px}
        h2{font-size:15px;margin-top:22px}.meta{color:#6b7280;margin-bottom:18px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
        .card{border:1px solid #ddd;padding:10px;border-radius:6px}.label{font-size:11px;color:#6b7280}.value{font-size:18px;font-weight:700}
        table{width:100%;border-collapse:collapse;font-size:11px} th,td{border:1px solid #ddd;padding:6px;text-align:left} th{background:#f3f4f6}
        .breakdown{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin:6px 0 18px;font-size:12px}
        .breakdown div{display:flex;justify-content:space-between;padding:2px 0}
        .breakdown .total{border-top:1px solid #d1d5db;margin-top:6px;padding-top:6px;font-weight:700}
      </style></head><body>
      <h1>Faturamento</h1><div class="meta">Período: ${period}</div>
      <div class="cards">
        <div class="card"><div class="label">Receita Bruta</div><div class="value">${fmt(totalRevenue)}</div></div>
        <div class="card"><div class="label">Repasses</div><div class="value">-${fmt(totalPayout)}</div></div>
        <div class="card"><div class="label">Custos</div><div class="value">-${fmt(totalCustos)}</div></div>
        <div class="card"><div class="label">Comissão Plataforma (${commissionPct}%)</div><div class="value">-${fmt(platformCommission)}</div></div>
        <div class="card"><div class="label">Receita Líquida</div><div class="value">${fmt(receitaLiquida)}</div></div>
        <div class="card"><div class="label">Margem Líquida</div><div class="value">${margemLiquida}%</div></div>
        <div class="card"><div class="label">Ticket Médio</div><div class="value">${fmt(ticketMedio)}</div></div>
        <div class="card"><div class="label">Atendimentos</div><div class="value">${totalAppointments}</div></div>
      </div>
      <div class="breakdown">
        <div><span>Receita Bruta</span><span>${fmt(totalRevenue)}</span></div>
        <div><span>Repasses</span><span>-${fmt(totalPayout)}</span></div>
        <div><span>Custos</span><span>-${fmt(totalCustos)}</span></div>
        <div><span>Comissão Plataforma (${commissionPct}%${commissionPromoActive ? ' · período promocional' : ''})</span><span>-${fmt(platformCommission)}</span></div>
        <div class="total"><span>Resultado</span><span>${fmt(receitaLiquida)}</span></div>
      </div>
      <h2>Repasses por Profissional</h2>
      <table><thead><tr><th>Profissional</th><th>Atend.</th><th>Receita Bruta</th><th>Comissão</th><th>Repasse</th></tr></thead><tbody>${payoutRows || '<tr><td colspan="5">Sem dados</td></tr>'}</tbody></table>
      <h2>Custos por Categoria</h2>
      <table><thead><tr><th>Categoria</th><th>Qtd.</th><th>Valor</th></tr></thead><tbody>${custoRows || '<tr><td colspan="3">Sem custos no período</td></tr>'}</tbody></table>
      <h2>Receita por Canal</h2>
      <table><thead><tr><th>Canal</th><th>Valor</th></tr></thead><tbody>${channelRows || '<tr><td colspan="2">Sem dados</td></tr>'}</tbody></table>
      <script>window.onload=()=>{window.print()}</script></body></html>
    `)
  }

  return (
    <div className="animate-fade-in admin-analytics-page">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Faturamento</h2>
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
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Receipt size={14} /> Custos</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-danger)' }}>-{fmt(totalCustos)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{custosCount} custo(s) no período</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={14} /> Comissão Plataforma</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-danger)' }}>-{fmt(platformCommission)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {commissionPct}% {commissionPromoActive ? '(período promocional)' : ''}
          </span>
        </div>
      </div>

      {/* Cards - Linha 2 (Receita Líquida com detalhamento) */}
      <div className="metrics-row stagger-children" style={{ marginTop: 'var(--space-4)' }}>
        <div className="metric-card admin-grid-span-2">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> Receita Líquida</span>
          <span className="metric-value" style={{ color: receitaLiquida >= 0 ? 'var(--color-accent-emerald)' : 'var(--color-accent-danger)' }}>{fmt(receitaLiquida)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>margem: {margemLiquida}%</span>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Receita Bruta</span><span>{fmt(totalRevenue)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-accent-danger)' }}><span>Repasses</span><span>-{fmt(totalPayout)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-accent-danger)' }}><span>Custos</span><span>-{fmt(totalCustos)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-accent-danger)' }}><span>Comissão Plataforma</span><span>-{fmt(platformCommission)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 4, borderTop: '1px dashed var(--color-border)' }}><span>Resultado</span><span style={{ color: receitaLiquida >= 0 ? 'var(--color-accent-emerald)' : 'var(--color-accent-danger)' }}>{fmt(receitaLiquida)}</span></div>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> Atendimentos</span>
          <span className="metric-value">{totalAppointments}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{completedAppts} concluídos</span>
        </div>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={14} /> Ticket Médio</span>
          <span className="metric-value">{fmt(ticketMedio)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>por atendimento concluído</span>
        </div>
      </div>

      {/* Cards - Linha 3 (Inadimplência + Receita por Canal) */}
      <div className="metrics-row stagger-children" style={{ marginTop: 'var(--space-4)' }}>
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> Inadimplência</span>
          <span className="metric-value" style={{ color: totalDelinquency > 0 ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)' }}>
            {fmt(totalDelinquency)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{delinquency.length} pagamento(s) pendente(s)</span>
        </div>
        <div className="metric-card admin-grid-span-3">
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

      {/* Custos por Categoria */}
      {custosByCategory.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            <Receipt size={18} /> Custos por Categoria
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {custosByCategory.map(c => {
              const max = Math.max(...custosByCategory.map(x => x.value)) || 1
              const pct = (c.value / max) * 100
              const totalPct = totalCustos > 0 ? Math.round((c.value / totalCustos) * 100) : 0
              return (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{c.name} ({totalPct}%) · {c.count} item(s)</span>
                    <span style={{ fontWeight: 500 }}>{fmt(c.value)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--color-accent-danger)' }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="charts-row" style={{ marginTop: 'var(--space-6)' }}>
        <div className="chart-card">
          <h3><CreditCard size={16} style={{ display: 'inline', marginRight: 8 }} />Receita por Canal de Pagamento</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4) 0' }}>
            {revenueByChannel.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados no período.</p>}
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
          <div className="admin-grid-4 admin-grid-compact">
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
              const isLatest = i === monthlyRevenue.length - 1
              const revH = (h.revenue / maxMonthlyRevenue) * 100
              const netH = (Math.max(0, h.netRevenue || 0) / maxMonthlyRevenue) * 100
              const tooltip = `${h.month}\nReceita: ${fmt(h.revenue)}\nRepasses: -${fmt(h.payout || 0)}\nCustos: -${fmt(h.custos || 0)}\nComissão: -${fmt(h.commission || 0)}\nLíquido: ${fmt(h.netRevenue || 0)}`
              return (
                <div key={i} className="bar-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, margin: '0 2px' }} title={tooltip}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: '100%' }}>
                    <div
                      style={{
                        flex: 1,
                        height: `${Math.max(revH, 2)}%`,
                        minHeight: 2,
                        background: 'var(--color-accent-brand)',
                        borderRadius: '3px 3px 0 0',
                        opacity: isLatest ? 1 : 0.75
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        height: `${Math.max(netH, 2)}%`,
                        minHeight: 2,
                        background: (h.netRevenue || 0) >= 0 ? 'var(--color-accent-emerald)' : 'var(--color-accent-danger)',
                        borderRadius: '3px 3px 0 0',
                        opacity: isLatest ? 1 : 0.75
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 9, marginTop: 4, color: 'var(--color-text-muted)', textAlign: 'center' }}>{h.month}</span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: 'var(--color-accent-brand)', borderRadius: 2 }} /> Receita Bruta
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: 'var(--color-accent-emerald)', borderRadius: 2 }} /> Receita Líquida
            </span>
            <span>Acumulado em 12 meses: {fmt(monthlyTotal)}</span>
            <span>Amplitude: {fmt(bestMonth.revenue - worstMonth.revenue)}</span>
          </div>
        </div>
      </div>

      {/* Tabela Repasses */}
      <div className="card admin-table-card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          Repasses por Profissional
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Profissional</th>
              <th>Atendimentos</th>
              <th>Receita Bruta</th>
              <th>Comissão</th>
              <th>Repasse</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>Nenhum repasse registrado no período.</td></tr>
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

      {/* Tabela Inadimplência */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          <AlertTriangle size={18} color="var(--color-accent-danger)" />
          Inadimplência (Pagamentos Pendentes)
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
