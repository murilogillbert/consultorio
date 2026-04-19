import { useState, type ReactNode } from 'react'
import {
  CalendarDays, Star, Shield, DollarSign, ChevronLeft, ChevronRight,
  Clock, User, CheckCircle, XCircle, AlertCircle, TrendingUp, Award, Bell
} from 'lucide-react'
import {
  useProfessionalAgenda,
  useProfessionalReviews,
  useProfessionalInsuranceStats,
  useProfessionalEarnings,
  useProfessionalAlerts,
  type AlertMessage,
} from '../../hooks/useProfessionalPortal'
import { useAuth } from '../../contexts/AuthContext'

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: ReactNode }> = {
  SCHEDULED:   { label: 'Agendada',     color: '#C9A84C', icon: <Clock size={12} /> },
  CONFIRMED:   { label: 'Confirmada',   color: '#2D6A4F', icon: <CheckCircle size={12} /> },
  IN_PROGRESS: { label: 'Em andamento', color: '#1a56db', icon: <AlertCircle size={12} /> },
  COMPLETED:   { label: 'Concluída',    color: '#2D6A4F', icon: <CheckCircle size={12} /> },
  CANCELLED:   { label: 'Cancelada',    color: '#8b2020', icon: <XCircle size={12} /> },
}

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function hasDisplayPrice(value: number) {
  return value > 0
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function addWeeks(dateStr: string, weeks: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

function getMondayOfCurrentWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

// ─── Stars component ─────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={14}
          fill={star <= Math.round(rating) ? '#C9A84C' : 'none'}
          color={star <= Math.round(rating) ? '#C9A84C' : 'var(--color-border-default)'}
        />
      ))}
    </div>
  )
}

// ─── Alerts Panel ────────────────────────────────────────────────────────────
function AlertsPanel({ alerts, isLoading }: { alerts?: AlertMessage[]; isLoading: boolean }) {
  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'agora'
    if (mins < 60) return `${mins}min atrás`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h atrás`
    return `${Math.floor(hrs / 24)}d atrás`
  }

  return (
    <div className="prof-alerts-panel">
      <div className="prof-alerts-header">
        <Bell size={15} />
        <span>Avisos da Recepção</span>
        {alerts && alerts.length > 0 && (
          <span className="prof-alerts-badge">{alerts.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: 80, borderRadius: 8, margin: '12px 0' }} />
      ) : !alerts || alerts.length === 0 ? (
        <div className="prof-alerts-empty">
          <Bell size={28} style={{ opacity: 0.3 }} />
          <p>Nenhum aviso recebido</p>
        </div>
      ) : (
        <div className="prof-alerts-list">
          {alerts.map(alert => (
            <div key={alert.id} className="prof-alert-item">
              <div className="prof-alert-content">{alert.content}</div>
              <div className="prof-alert-meta">
                <span className="prof-alert-sender">{alert.sender.name}</span>
                <span className="prof-alert-time">{timeAgo(alert.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Agenda ─────────────────────────────────────────────────────────────
function AgendaTab() {
  const [weekStart, setWeekStart] = useState(getMondayOfCurrentWeek())
  const { data, isLoading } = useProfessionalAgenda(weekStart)
  const { data: alerts, isLoading: alertsLoading } = useProfessionalAlerts()

  const prevWeek = () => setWeekStart(addWeeks(weekStart, -1))
  const nextWeek = () => setWeekStart(addWeeks(weekStart, 1))
  const goToday  = () => setWeekStart(getMondayOfCurrentWeek())

  const weekLabel = data
    ? `${new Date(data.weekStart).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${new Date(data.weekEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : '...'

  // Group appointments by day
  const byDay: Record<string, NonNullable<typeof data>['appointments']> = {}
  if (data) {
    for (const appt of data.appointments) {
      const day = appt.startTime.split('T')[0]
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(appt)
    }
  }

  const days = data
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(data.weekStart)
        d.setDate(d.getDate() + i)
        return d.toISOString().split('T')[0]
      })
    : []

  return (
    <div className="prof-agenda-layout">
      <div className="prof-agenda-main">
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={prevWeek}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: 600, fontSize: 15, minWidth: 220, textAlign: 'center' }}>{weekLabel}</span>
        <button className="btn btn-ghost btn-sm" onClick={nextWeek}><ChevronRight size={16} /></button>
        <button className="btn btn-outline btn-sm" onClick={goToday}>Hoje</button>
        {data && (
          <span className="badge badge-gold" style={{ marginLeft: 'auto' }}>
            {data.appointments.length} consulta{data.appointments.length !== 1 ? 's' : ''} na semana
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      ) : days.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', paddingTop: 40 }}>Nenhuma consulta nesta semana.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {days.map(day => {
            const appts = byDay[day] || []
            const dateObj = new Date(day + 'T12:00:00')
            const dayLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
            const isToday = day === getMondayOfCurrentWeek().split('T')[0] ||
              new Date().toISOString().split('T')[0] === day

            return (
              <div key={day} style={{
                background: 'var(--color-bg-secondary)',
                borderRadius: 12,
                overflow: 'hidden',
                border: isToday ? '2px solid var(--color-accent-emerald)' : '1px solid var(--color-border-default)',
              }}>
                <div style={{
                  padding: '10px 16px',
                  background: isToday ? 'rgba(45,106,79,0.08)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderBottom: '1px solid var(--color-border-default)',
                }}>
                  <CalendarDays size={14} style={{ color: 'var(--color-accent-emerald)' }} />
                  <span style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{dayLabel}</span>
                  {isToday && <span className="badge badge-emerald" style={{ fontSize: 11 }}>Hoje</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {appts.length} consulta{appts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {appts.length === 0 ? (
                  <div style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: 13 }}>
                    Nenhuma consulta agendada
                  </div>
                ) : (
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {appts.map(appt => {
                      const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.SCHEDULED
                      return (
                        <div key={appt.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px',
                          background: 'var(--color-bg-primary)',
                          borderRadius: 8,
                          borderLeft: `4px solid ${appt.service.color}`,
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600, minWidth: 50, color: 'var(--color-text-secondary)' }}>
                            {new Date(appt.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{appt.service.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <User size={11} /> {appt.patient.name}
                              <span style={{ marginLeft: 6 }}>• {appt.service.durationMinutes}min</span>
                            </div>
                          </div>
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 600, padding: '3px 8px',
                            borderRadius: 999, background: `${cfg.color}18`, color: cfg.color,
                          }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {hasDisplayPrice(appt.service.price) && (
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent-emerald)' }}>
                              {formatMoney(appt.service.price)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </div>
      <AlertsPanel alerts={alerts} isLoading={alertsLoading} />
    </div>
  )
}

// ─── Tab: Avaliações ─────────────────────────────────────────────────────────
function AvaliacoesTab() {
  const { data, isLoading } = useProfessionalReviews()

  if (isLoading) return <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
  if (!data) return <p style={{ color: 'var(--color-text-muted)' }}>Nenhuma avaliação encontrada.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Resumo geral */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24,
        padding: 24, background: 'var(--color-bg-secondary)',
        borderRadius: 16, border: '1px solid var(--color-border-default)',
      }}>
        {/* Nota grande */}
        <div style={{ textAlign: 'center', padding: '0 20px', borderRight: '1px solid var(--color-border-default)' }}>
          <div style={{ fontSize: 52, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>
            {data.averageRating.toFixed(1)}
          </div>
          <Stars rating={data.averageRating} />
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
            {data.totalReviews} avaliação{data.totalReviews !== 1 ? 'ões' : ''}
          </div>
        </div>

        {/* Distribuição de estrelas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
          {[5, 4, 3, 2, 1].map(star => {
            const item = data.distribution.find(d => d.star === star)
            const count = item?.count ?? 0
            const pct = data.totalReviews > 0 ? Math.round(count / data.totalReviews * 100) : 0
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, minWidth: 8 }}>{star}</span>
                <Star size={12} fill="#C9A84C" color="#C9A84C" />
                <div style={{ flex: 1, height: 8, background: 'var(--color-border-default)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#C9A84C', borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 20, textAlign: 'right' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lista de avaliações */}
      {data.reviews.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '30px 0' }}>
          Nenhuma avaliação recebida ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.reviews.map(review => (
            <div key={review.id} style={{
              padding: 16, background: 'var(--color-bg-secondary)',
              borderRadius: 12, border: '1px solid var(--color-border-default)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {review.patient.avatarUrl ? (
                    <img src={review.patient.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--color-accent-emerald)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13,
                    }}>
                      {review.patient.name[0]}
                    </div>
                  )}
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{review.patient.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Stars rating={review.rating} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              {review.comment && (
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, fontStyle: 'italic' }}>
                  "{review.comment}"
                </p>
              )}
              {review.appointmentId && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Vinculada a uma consulta
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Convênios ───────────────────────────────────────────────────────────
function ConveniosTab() {
  const { data, isLoading } = useProfessionalInsuranceStats()

  if (isLoading) return <div className="skeleton" style={{ height: 250, borderRadius: 12 }} />
  if (!data) return <p style={{ color: 'var(--color-text-muted)' }}>Sem dados de convênios.</p>

  const total = data.totalAppointments

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total de consultas', value: total, color: 'var(--color-accent-emerald)' },
          { label: 'Com convênio', value: data.totalWithInsurance, color: '#C9A84C' },
          { label: 'Sem convênio', value: data.withoutInsurance, color: 'var(--color-text-muted)' },
        ].map(card => (
          <div key={card.label} style={{
            padding: 16, background: 'var(--color-bg-secondary)',
            borderRadius: 12, border: '1px solid var(--color-border-default)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Ranking de convênios */}
      {data.insurancePlans.length === 0 ? (
        <div style={{
          padding: 24, textAlign: 'center',
          background: 'var(--color-bg-secondary)', borderRadius: 12,
          border: '1px solid var(--color-border-default)',
        }}>
          <Shield size={32} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Nenhum convênio identificado nas consultas. Os convênios são vinculados aos serviços no painel de administração.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-bg-secondary)', borderRadius: 12,
          border: '1px solid var(--color-border-default)', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-default)', fontWeight: 600, fontSize: 14 }}>
            Convênios mais atendidos
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.insurancePlans.map((plan, idx) => (
              <div key={plan.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', background: 'var(--color-accent-emerald)',
                      color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{plan.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{plan.count} consulta{plan.count !== 1 ? 's' : ''}</span>
                    <span className="badge badge-gold" style={{ fontSize: 11 }}>{plan.percentage}%</span>
                  </div>
                </div>
                <div style={{ height: 8, background: 'var(--color-border-default)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${plan.percentage}%`, height: '100%',
                    background: `hsl(${150 - idx * 20}, 50%, 40%)`,
                    borderRadius: 4, transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consultas sem convênio */}
      {data.withoutInsurance > 0 && total > 0 && (
        <div style={{
          padding: 14, background: 'var(--color-bg-secondary)', borderRadius: 12,
          border: '1px solid var(--color-border-default)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Consultas sem convênio</div>
            <div style={{ height: 8, background: 'var(--color-border-default)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
              <div style={{
                width: `${Math.round(data.withoutInsurance / total * 100)}%`,
                height: '100%', background: 'var(--color-text-muted)', borderRadius: 4,
              }} />
            </div>
          </div>
          <span className="badge" style={{ fontSize: 11, background: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
            {Math.round(data.withoutInsurance / total * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Ganhos ──────────────────────────────────────────────────────────────
function GanhosTab() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useProfessionalEarnings(year, month)

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: 600, fontSize: 15, minWidth: 180, textAlign: 'center', textTransform: 'capitalize' }}>
          {formatMonthLabel(year, month)}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      ) : !data ? null : (
        <>
          {/* Cards de totais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Consultas concluídas', value: String(data.totalCompleted), icon: <CheckCircle size={20} />, color: 'var(--color-accent-emerald)' },
              { label: 'Receita bruta', value: formatMoney(data.totalGross), icon: <TrendingUp size={20} />, color: '#1a56db' },
              { label: `Seus ganhos (${data.commission}%)`, value: formatMoney(data.totalEarnings), icon: <DollarSign size={20} />, color: '#C9A84C' },
            ].map(card => (
              <div key={card.label} style={{
                padding: 20, background: 'var(--color-bg-secondary)',
                borderRadius: 14, border: `2px solid ${card.color}22`,
              }}>
                <div style={{ color: card.color, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Gráfico de histórico (barras simples) */}
          {data.monthlyHistory.length > 0 && (
            <div style={{
              background: 'var(--color-bg-secondary)', borderRadius: 14,
              border: '1px solid var(--color-border-default)', padding: 20,
            }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Histórico de ganhos (últimos 6 meses)</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                {data.monthlyHistory.map(m => {
                  const maxEarning = Math.max(...data.monthlyHistory.map(x => x.earning), 1)
                  const pct = (m.earning / maxEarning) * 100
                  const isCurrent = m.year === year && m.month === month
                  return (
                    <div key={`${m.year}-${m.month}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                        {formatMoney(m.earning)}
                      </div>
                      <div style={{
                        width: '100%', borderRadius: '4px 4px 0 0',
                        height: `${Math.max(pct, 4)}%`,
                        background: isCurrent ? '#C9A84C' : 'var(--color-accent-emerald)',
                        opacity: isCurrent ? 1 : 0.6,
                        transition: 'height 0.4s ease',
                      }} />
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', textTransform: 'capitalize' }}>
                        {m.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tabela de consultas */}
          {data.appointments.length === 0 ? (
            <div style={{
              padding: 24, textAlign: 'center', background: 'var(--color-bg-secondary)',
              borderRadius: 12, border: '1px solid var(--color-border-default)',
            }}>
              <DollarSign size={32} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Nenhuma consulta concluída neste mês.</p>
            </div>
          ) : (
            <div style={{
              background: 'var(--color-bg-secondary)', borderRadius: 14,
              border: '1px solid var(--color-border-default)', overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 90px 90px 90px',
                padding: '10px 16px', borderBottom: '1px solid var(--color-border-default)',
                fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)',
              }}>
                <span>Paciente</span>
                <span>Serviço</span>
                <span style={{ textAlign: 'right' }}>Valor</span>
                <span style={{ textAlign: 'right' }}>Comissão</span>
                <span style={{ textAlign: 'right' }}>Seu ganho</span>
              </div>
              {data.appointments.map(appt => (
                <div key={appt.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 90px 90px 90px',
                  padding: '10px 16px', borderBottom: '1px solid var(--color-border-default)',
                  fontSize: 13, alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 500 }}>{appt.patientName}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{appt.serviceName}</span>
                  <span style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{formatMoney(appt.paidAmount)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{appt.commission}%</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: '#C9A84C' }}>{formatMoney(appt.earning)}</span>
                </div>
              ))}
              {/* Total */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 90px 90px 90px',
                padding: '12px 16px', background: 'rgba(45,106,79,0.05)',
                fontSize: 13, fontWeight: 700, alignItems: 'center',
              }}>
                <span>Total</span>
                <span />
                <span style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{formatMoney(data.totalGross)}</span>
                <span />
                <span style={{ textAlign: 'right', color: '#C9A84C', fontSize: 15 }}>{formatMoney(data.totalEarnings)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
type Tab = 'agenda' | 'avaliacoes' | 'convenios' | 'ganhos'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'agenda',     label: 'Agenda',     icon: <CalendarDays size={16} /> },
  { id: 'avaliacoes', label: 'Avaliações', icon: <Star size={16} /> },
  { id: 'convenios',  label: 'Convênios',  icon: <Shield size={16} /> },
  { id: 'ganhos',     label: 'Ganhos',     icon: <DollarSign size={16} /> },
]

export default function ProfissionalDashboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('agenda')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', paddingTop: 'var(--navbar-height)' }}>
      <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <Award size={22} style={{ color: 'var(--color-accent-emerald)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
              Meu Portal
            </h1>
          </div>
          {user && (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>
              Bem-vindo(a), <strong>{user.name}</strong>
            </p>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: 'var(--color-bg-secondary)',
          borderRadius: 12, padding: 4,
          border: '1px solid var(--color-border-default)',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '10px 8px',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                background: activeTab === tab.id ? 'var(--color-bg-primary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-accent-emerald)' : 'var(--color-text-secondary)',
                boxShadow: activeTab === tab.id ? 'var(--shadow-card)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ animation: 'fadeIn 200ms ease' }}>
          {activeTab === 'agenda'     && <AgendaTab />}
          {activeTab === 'avaliacoes' && <AvaliacoesTab />}
          {activeTab === 'convenios'  && <ConveniosTab />}
          {activeTab === 'ganhos'     && <GanhosTab />}
        </div>
      </div>
    </div>
  )
}
