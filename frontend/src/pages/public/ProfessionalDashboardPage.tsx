import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Star, DollarSign, BarChart2, ChevronLeft, ChevronRight,
  LogOut, Clock, CheckCircle, XCircle, AlertCircle, User
} from 'lucide-react'
import {
  useProfessionalLogin, useProfessionalMe, useProfessionalAgenda,
  useProfessionalReviews, useProfessionalStats,
  isProfessionalLoggedIn, clearProfessional, getProfessionalUser
} from '../../hooks/useProfessionalPortal'

// ── helpers ──────────────────────────────────────────────────────────────────

function weekStartOf(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekLabel(date: Date): string {
  const end = new Date(date)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return `${fmt(date)} – ${fmt(end)}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatMoney(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#6B7280',
  CONFIRMED: '#2563EB',
  IN_PROGRESS: '#D97706',
  COMPLETED: '#16A34A',
  CANCELLED: '#DC2626',
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} fill={n <= rating ? '#F59E0B' : 'none'} color={n <= rating ? '#F59E0B' : '#D1D5DB'} />
      ))}
    </span>
  )
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const loginMutation = useProfessionalLogin()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await loginMutation.mutateAsync({ email, password })
      window.location.reload()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Credenciais inválidas.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 'var(--space-8)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ width: 56, height: 56, background: 'var(--color-accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
            <User size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>Portal do Profissional</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4, fontSize: 14 }}>Acesse com suas credenciais</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">E-mail</label>
            <input className="input-field" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Senha</label>
            <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{ color: 'var(--color-accent-danger)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button className="btn btn-primary btn-lg" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

type Tab = 'agenda' | 'reviews' | 'stats'

export default function ProfessionalDashboardPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('agenda')
  const [weekOffset, setWeekOffset] = useState(0)
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'year'>('month')

  const currentWeekStart = weekStartOf(new Date())
  const displayWeek = new Date(currentWeekStart)
  displayWeek.setDate(displayWeek.getDate() + weekOffset * 7)
  const weekStartStr = displayWeek.toISOString().split('T')[0]

  const { data: me } = useProfessionalMe()
  const { data: agenda = [], isLoading: loadingAgenda } = useProfessionalAgenda(weekStartStr)
  const { data: reviews, isLoading: loadingReviews } = useProfessionalReviews()
  const { data: stats, isLoading: loadingStats } = useProfessionalStats(statsPeriod)

  if (!isProfessionalLoggedIn()) return <LoginForm />

  const user = getProfessionalUser()

  const handleLogout = () => {
    clearProfessional()
    navigate('/')
  }

  // Group agenda by day
  const byDay: Record<string, typeof agenda> = {}
  for (const apt of agenda) {
    const day = apt.startTime.split('T')[0]
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(apt)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)', padding: '0 var(--space-4)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
              {(me?.name || user?.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 15 }}>{me?.name || user?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{me?.specialty || 'Profissional'}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={15} /> Sair
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {stats && (
        <div className="container" style={{ paddingTop: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Consultas (mês)', value: stats.completedCount, icon: <CheckCircle size={18} color="#16A34A" /> },
              { label: 'Avaliação média', value: reviews ? `${reviews.averageRating.toFixed(1)} ★` : '—', icon: <Star size={18} color="#F59E0B" /> },
              { label: 'Receita bruta', value: formatMoney(stats.totalRevenue), icon: <BarChart2 size={18} color="#2563EB" /> },
              { label: 'A receber', value: formatMoney(stats.netPayout), icon: <DollarSign size={18} color="#16A34A" />, highlight: true },
            ].map(card => (
              <div key={card.label} style={{ background: card.highlight ? 'var(--color-accent-primary)' : 'var(--color-bg-card)', border: `1px solid ${card.highlight ? 'transparent' : 'var(--color-border)'}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: card.highlight ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)' }}>{card.label}</span>
                  {!card.highlight && card.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: 20, color: card.highlight ? 'white' : 'var(--color-text-primary)' }}>{card.value}</div>
                {card.highlight && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Comissão {stats.commissionPct}%</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="container" style={{ paddingTop: 24 }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
          {([['agenda', 'Agenda', Calendar], ['reviews', 'Avaliações', Star], ['stats', 'Estatísticas', BarChart2]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === key ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                color: tab === key ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                fontWeight: tab === key ? 600 : 400, fontSize: 14, transition: 'all 0.15s',
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── AGENDA TAB ── */}
        {tab === 'agenda' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={16} /></button>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 14 }}>{formatWeekLabel(displayWeek)}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={16} /></button>
            </div>

            {loadingAgenda ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 40 }}>Carregando agenda…</div>
            ) : Object.keys(byDay).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 48, background: 'var(--color-bg-card)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <Calendar size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p>Nenhuma consulta nesta semana.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, apts]) => (
                  <div key={day}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'capitalize', marginBottom: 8 }}>
                      {formatDate(day + 'T12:00:00')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {apts.map(apt => (
                        <div key={apt.id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeft: `4px solid ${STATUS_COLORS[apt.status] || '#6B7280'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>{apt.patientName}</div>
                            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{apt.serviceName}{apt.roomName ? ` • ${apt.roomName}` : ''}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                              <Clock size={13} /> {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
                            </div>
                            <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: STATUS_COLORS[apt.status], background: `${STATUS_COLORS[apt.status]}15`, padding: '2px 8px', borderRadius: 20 }}>
                              {apt.status === 'COMPLETED' && <CheckCircle size={11} />}
                              {apt.status === 'CANCELLED' && <XCircle size={11} />}
                              {(apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && <AlertCircle size={11} />}
                              {STATUS_LABELS[apt.status] || apt.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {tab === 'reviews' && (
          <div>
            {loadingReviews ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 40 }}>Carregando avaliações…</div>
            ) : !reviews || reviews.totalReviews === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 48, background: 'var(--color-bg-card)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <Star size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p>Nenhuma avaliação ainda.</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', background: 'var(--color-bg-card)', borderRadius: 12, border: '1px solid var(--color-border)', marginBottom: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{reviews.averageRating.toFixed(1)}</div>
                    <StarRow rating={Math.round(reviews.averageRating)} />
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{reviews.totalReviews} avaliações</div>
                  </div>
                  <div style={{ flex: 1, borderLeft: '1px solid var(--color-border)', paddingLeft: 20 }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviews.reviews.filter(r => r.rating === star).length
                      const pct = reviews.totalReviews > 0 ? (count / reviews.totalReviews) * 100 : 0
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 8 }}>{star}</span>
                          <Star size={11} fill="#F59E0B" color="#F59E0B" />
                          <div style={{ flex: 1, height: 6, background: 'var(--color-bg-secondary)', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#F59E0B', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 20 }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reviews.reviews.map(r => (
                    <div key={r.id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            {r.patientName[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{r.patientName}</div>
                            {r.serviceName && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{r.serviceName}</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <StarRow rating={r.rating} />
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      {r.comment && <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0, paddingLeft: 38 }}>{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STATS TAB ── */}
        {tab === 'stats' && (
          <div>
            {/* Period selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['week', 'month', 'year'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setStatsPeriod(p)}
                  className={statsPeriod === p ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                >
                  {{ week: 'Semana', month: 'Mês', year: 'Ano' }[p]}
                </button>
              ))}
            </div>

            {loadingStats ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 40 }}>Carregando estatísticas…</div>
            ) : !stats ? null : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Financial card */}
                <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>💰 Financeiro</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Receita bruta</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatMoney(stats.totalRevenue)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>A receber ({stats.commissionPct}%)</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#16A34A' }}>{formatMoney(stats.netPayout)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, height: 8, background: 'var(--color-bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${stats.commissionPct}%`, background: '#16A34A', borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Repasse {stats.commissionPct}%</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Clínica {100 - stats.commissionPct}%</span>
                  </div>
                </div>

                {/* Appointments card */}
                <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>📅 Consultas</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Agendadas', value: stats.scheduledCount, color: '#2563EB' },
                      { label: 'Concluídas', value: stats.completedCount, color: '#16A34A' },
                      { label: 'Canceladas', value: stats.cancelledCount, color: '#DC2626' },
                    ].map(item => (
                      <div key={item.label} style={{ textAlign: 'center', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: 10 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: item.color }}>{item.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service breakdown */}
                {stats.serviceBreakdown.length > 0 && (
                  <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>📊 Por Serviço</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {stats.serviceBreakdown.map((s, i) => {
                        const maxCount = stats.serviceBreakdown[0].count
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{s.name}</span>
                              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{s.count} consultas · {formatMoney(s.revenue)}</span>
                            </div>
                            <div style={{ height: 6, background: 'var(--color-bg-secondary)', borderRadius: 3 }}>
                              <div style={{ height: '100%', width: `${(s.count / maxCount) * 100}%`, background: 'var(--color-accent-primary)', borderRadius: 3 }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Insurance breakdown */}
                {stats.insuranceBreakdown.length > 0 && (
                  <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>🏥 Convênios nos Serviços</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {stats.insuranceBreakdown.map((ins, i) => (
                        <div key={i} style={{ padding: '6px 14px', background: 'var(--color-bg-secondary)', borderRadius: 20, fontSize: 13, color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
                          {ins.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
