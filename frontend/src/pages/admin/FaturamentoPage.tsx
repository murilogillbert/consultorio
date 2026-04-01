import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, QrCode, AlertTriangle, Download } from 'lucide-react'
import { useDashboardMetrics, useBillingData } from '../../hooks/useDashboard'
import { useAuth } from '../../contexts/AuthContext'

const PERIOD_OPTS = ['Hoje', '7 dias', '30 dias', '3 meses', '12 meses'] as const
type PeriodOpt = typeof PERIOD_OPTS[number]

function periodToApiParam(p: PeriodOpt): string {
  const map: Record<PeriodOpt, string> = {
    'Hoje': 'Hoje',
    '7 dias': '7 dias',
    '30 dias': '30 dias',
    '3 meses': '3 meses',
    '12 meses': '12 meses',
  }
  return map[p]
}

export default function FaturamentoPage() {
  const [period, setPeriod] = useState<PeriodOpt>('30 dias')
  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId

  const apiPeriod = periodToApiParam(period)

  const { data: dashData } = useDashboardMetrics(clinicId, apiPeriod)
  const { data: billingData, isLoading } = useBillingData(clinicId, undefined, undefined, apiPeriod)

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // Calcular repasse total real a partir dos payouts retornados pelo servidor
  const totalRepasse = useMemo(() => {
    return (billingData?.payouts || []).reduce((sum, p) => sum + p.net, 0)
  }, [billingData])

  const receitaLiquida = (dashData?.metrics.faturamentoMes || 0) - totalRepasse

  const mudanca = dashData?.metrics.faturamentoMudanca || 0
  const mudancaPositiva = mudanca >= 0

  if (isLoading) return (
    <div style={{ padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
      Carregando dados financeiros...
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Faturamento</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="date-presets">
            {PERIOD_OPTS.map(p => (
              <button
                key={p}
                className={`date-preset${period === p ? ' active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="export-btns">
            <button className="btn btn-secondary btn-sm"><Download size={14} /> CSV</button>
            <button className="btn btn-secondary btn-sm"><Download size={14} /> PDF</button>
          </div>
        </div>
      </div>

      <div className="metrics-row stagger-children">
        <div className="metric-card">
          <span className="metric-label">Receita Bruta</span>
          <span className="metric-value">{formatCurrency(dashData?.metrics.faturamentoMes || 0)}</span>
          <span className={`metric-change ${mudancaPositiva ? 'positive' : 'negative'}`}>
            {mudancaPositiva ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {' '}{Math.abs(mudanca).toFixed(1)}% vs período anterior
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Repasses (Real)</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-danger)' }}>
            -{formatCurrency(totalRepasse)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {billingData?.payouts.length
              ? `${billingData.payouts.length} profissional(is)`
              : 'Sem dados'}
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Receita Líquida</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>
            {formatCurrency(receitaLiquida)}
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Total Agendamentos</span>
          <span className="metric-value">{dashData?.metrics.totalAgendamentos ?? '—'}</span>
          <span className="badge badge-gold" style={{ alignSelf: 'flex-start' }}>{period}</span>
        </div>
      </div>

      {/* Revenue by Channel */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Receita por Canal de Pagamento</h3>
          <div className="chart-placeholder" style={{ flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 12, padding: 'var(--space-2)' }}>
            {!billingData?.revenueByChannel.length && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados no período.</p>
            )}
            {billingData?.revenueByChannel.map((ch, i) => {
              const maxVal = Math.max(...billingData.revenueByChannel.map(c => c.value)) || 1
              const pct = (ch.value / maxVal) * 100
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <QrCode size={18} color="var(--color-accent-gold)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{ch.name}</span>
                      <span style={{ fontWeight: 500 }}>{formatCurrency(ch.value)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--color-accent-emerald)' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="chart-card">
          <h3>Faturamento Mensal (Histórico 12 meses)</h3>
          <div className="chart-placeholder">
            {dashData?.charts.faturamentoAnual.map((h, i) => {
              const maxRev = Math.max(...dashData.charts.faturamentoAnual.map(d => d.revenue)) || 1
              const hPct = (h.revenue / maxRev) * 100
              return (
                <div key={i} className="bar-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, margin: '0 2px' }}>
                  <div
                    title={`${h.month}: ${formatCurrency(h.revenue)}`}
                    style={{ height: `${hPct}%`, minHeight: 2, background: 'var(--color-accent-brand)', borderRadius: '4px 4px 0 0', opacity: i === 11 ? 1 : 0.6 }}
                  />
                  <span style={{ fontSize: 9, marginTop: 4, color: 'var(--color-text-muted)' }}>{h.month}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
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
            {!billingData?.payouts.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>
                  Nenhum repasse registrado no período.
                </td>
              </tr>
            )}
            {billingData?.payouts.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td>{p.appointments}</td>
                <td>{formatCurrency(p.gross)}</td>
                <td><span className="badge badge-gold">{p.pct}</span></td>
                <td style={{ fontWeight: 700, color: 'var(--color-accent-emerald)' }}>{formatCurrency(p.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          <AlertTriangle size={18} color="var(--color-accent-danger)" />
          Inadimplência (Atrasos)
        </h3>
        {!billingData?.delinquency.length && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>
            Nenhum pagamento em atraso detectado.
          </p>
        )}
        {billingData?.delinquency.map((d, i) => (
          <div key={i} className="alert-row urgent" style={{ marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{d.patient}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {d.service} • Vencimento: {new Date(d.date).toLocaleDateString('pt-BR')} • {d.days} dias em atraso
              </div>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--color-accent-danger)' }}>{formatCurrency(d.value)}</span>
            <button className="btn btn-ghost btn-sm">Cobrar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
