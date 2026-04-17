import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Clock, AlertTriangle, XCircle, UserCheck, Plus, Receipt, Bell, Paperclip } from 'lucide-react'
import { useAppointments, type Appointment } from '../../hooks/useAppointments'
import { useAnnouncements, useMarkAnnouncementRead } from '../../hooks/useAnnouncements'
import { useAuth } from '../../contexts/AuthContext'
import PaymentModal from '../../components/PaymentModal'

const URGENCY_CSS: Record<string, string> = { NORMAL: 'normal', IMPORTANT: 'important', URGENT: 'urgent' }

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId
  const [showChargeSelector, setShowChargeSelector] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedChargeAppointment, setSelectedChargeAppointment] = useState<Appointment | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const { data: appointments = [], refetch: refetchAppointments } = useAppointments(today + 'T00:00:00', today + 'T23:59:59')
  const { data: announcements = [], isLoading: loadingAvisos } = useAnnouncements(clinicId)
  const markRead = useMarkAnnouncementRead()

  const totalAppointments = appointments.length
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length
  const pendingCount = appointments.filter(a => a.status === 'SCHEDULED').length
  const cancelledCount = appointments.filter(a => a.status === 'CANCELLED').length
  const confirmedPct = totalAppointments > 0 ? Math.round((confirmedCount / totalAppointments) * 100) : 0
  const cancelledPct = totalAppointments > 0 ? Math.round((cancelledCount / totalAppointments) * 100) : 0

  // Waiting list: appointments today that are CONFIRMED/SCHEDULED with start time passed
  const now = new Date()
  const waiting = appointments
    .filter(a => (a.status === 'CONFIRMED' || a.status === 'SCHEDULED') && new Date(a.startTime) <= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5)

  const waitMinutes = (appt: typeof appointments[0]) => {
    const diff = Math.floor((now.getTime() - new Date(appt.startTime).getTime()) / 60000)
    return diff > 0 ? `${diff} min` : 'Agora'
  }
  const chargeableAppointments = appointments
    .filter(a => a.status !== 'CANCELLED' && a.paymentStatus !== 'PAID')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  return (
    <div className="animate-fade-in">
      {/* Announcement Feed */}
      <div className="announcement-feed">
        <div className="announcement-feed-header">
          <Bell size={18} color="var(--color-accent-gold)" />
          <h3>Avisos da Clínica</h3>
        </div>
        {loadingAvisos && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>Carregando avisos...</p>
        )}
        {!loadingAvisos && announcements.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <Bell size={36} />
            <p>Nenhum aviso no momento</p>
          </div>
        )}
        {announcements.map((a) => {
          const userId = (user as any)?.id
          const alreadyRead = a.reads?.some(r => r.userId === userId)
          const dateLabel = new Date(a.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          return (
            <div key={a.id} className={`announcement-item${!alreadyRead ? ' unread' : ''}`}>
              <div className={`announcement-urgency ${URGENCY_CSS[a.urgency] || 'normal'}`} />
              <div className="announcement-body">
                <h4>{a.title}</h4>
                <p>{a.content}</p>
                <div className="announcement-meta">
                  <span className="announcement-time">
                    {a.fileUrl && <Paperclip size={11} style={{ display: 'inline', marginRight: 4 }} />}
                    {dateLabel}
                  </span>
                  {!alreadyRead && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12 }}
                      onClick={() => markRead.mutate(a.id)}
                      disabled={markRead.isPending}
                    >
                      Marcar como lido
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Metric Cards */}
      <div className="metrics-row stagger-children">
        <div className="metric-card">
          <span className="metric-label">Total de Agendamentos</span>
          <span className="metric-value">{totalAppointments}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck size={14} color="var(--color-accent-emerald)" />
            <span className="text-caption">Hoje, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Confirmados</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>{confirmedCount}</span>
          <span className="badge badge-emerald" style={{ alignSelf: 'flex-start' }}>{confirmedPct}%</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Pendentes</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-gold)' }}>{pendingCount}</span>
          <span className="badge badge-gold" style={{ alignSelf: 'flex-start' }}>Aguardando</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Cancelados</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-danger)' }}>{cancelledCount}</span>
          <span className="badge badge-danger" style={{ alignSelf: 'flex-start' }}>{cancelledPct}%</span>
        </div>
      </div>

      {/* Alerts — derived from real data */}
      {(pendingCount > 0 || cancelledCount > 0 || waiting.length > 0) && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Alertas Operacionais</h3>
          <div className="alerts-list">
            {waiting.length > 0 && (
              <div className="alert-row urgent">
                <XCircle size={18} color="var(--color-accent-danger)" />
                <span className="alert-text">{waiting.length} paciente{waiting.length > 1 ? 's' : ''} aguardando atendimento</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recepcao/agenda')}>Ver</button>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="alert-row">
                <AlertTriangle size={18} color="var(--color-accent-warning)" />
                <span className="alert-text">{pendingCount} agendamento{pendingCount > 1 ? 's' : ''} sem confirmação</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recepcao/agenda')}>Ver</button>
              </div>
            )}
            {cancelledCount > 0 && (
              <div className="alert-row">
                <AlertTriangle size={18} color="var(--color-accent-warning)" />
                <span className="alert-text">{cancelledCount} cancelamento{cancelledCount > 1 ? 's' : ''} hoje</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recepcao/agenda')}>Ver</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Waiting list — real data */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="var(--color-accent-gold)" />
          Na Espera Agora
        </h3>
        {waiting.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhum paciente aguardando no momento.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {waiting.map((appt) => {
              const name = appt.patient?.user?.name || appt.patient?.name || 'Paciente'
              const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
              const startLabel = new Date(appt.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--color-border-default)' }}>
                  <div className="avatar avatar-sm avatar-placeholder">{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{appt.service?.name || 'Serviço'} — {startLabel}</div>
                  </div>
                  <span className="badge badge-warning">{waitMinutes(appt)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Ações Rápidas</h3>
      <div className="quick-actions">
        <button className="quick-action-btn" onClick={() => navigate('/recepcao/agenda')}>
          <Plus size={18} /> Novo Agendamento
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/recepcao/agenda')}>
          <UserCheck size={18} /> Registrar Chegada
        </button>
        <button className="quick-action-btn" onClick={() => setShowChargeSelector(true)}>
          <Receipt size={18} /> Emitir Cobrança
        </button>
      </div>

      {showChargeSelector && (
        <div className="modal-overlay" onClick={() => setShowChargeSelector(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Selecionar atendimento para cobrança</h3>
              <button className="modal-close" onClick={() => setShowChargeSelector(false)}>
                <XCircle size={20} />
              </button>
            </div>
            <div className="modal-body">
              {chargeableAppointments.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 16px' }}>
                  <Receipt size={36} />
                  <p>Nenhum atendimento pendente de cobrança.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {chargeableAppointments.map(appt => {
                    const name = appt.patient?.user?.name || appt.patient?.name || 'Paciente'
                    const timeLabel = new Date(appt.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <button
                        key={appt.id}
                        className="btn btn-ghost"
                        style={{
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 14px',
                          border: '1px solid var(--color-border-default)',
                          borderRadius: 12,
                        }}
                        onClick={() => {
                          setSelectedChargeAppointment(appt)
                          setShowChargeSelector(false)
                          setShowPaymentModal(true)
                        }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                          <strong style={{ fontSize: 14 }}>{name}</strong>
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {appt.service?.name || 'Serviço'} · {timeLabel}
                          </span>
                        </span>
                        <span className="badge badge-gold">
                          {appt.status === 'COMPLETED' ? 'Pós-atendimento' : 'Em aberto'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowChargeSelector(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedChargeAppointment && (
        <PaymentModal
          appointmentId={selectedChargeAppointment.id}
          serviceName={selectedChargeAppointment.service?.name || 'Consulta'}
          servicePrice={Math.round((selectedChargeAppointment.service?.price ?? 0) * 100)}
          appointmentStatus={selectedChargeAppointment.status}
          paymentStatus={selectedChargeAppointment.paymentStatus}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedChargeAppointment(null)
          }}
          onPaid={() => {
            setShowPaymentModal(false)
            setSelectedChargeAppointment(null)
            void refetchAppointments()
          }}
        />
      )}
    </div>
  )
}
