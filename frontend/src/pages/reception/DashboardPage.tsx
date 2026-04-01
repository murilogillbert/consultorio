import { CalendarCheck, Clock, AlertTriangle, XCircle, UserCheck, Plus, Receipt, Bell, Paperclip } from 'lucide-react'
import { useAppointments } from '../../hooks/useAppointments'

const announcements = [
  { title: 'Horário alterado na sexta-feira', body: 'O expediente será encerrado às 16h na próxima sexta-feira devido à confraternização da equipe.', urgency: 'normal' as const, time: 'Há 2 horas', unread: true },
  { title: 'Novo protocolo de higienização', body: 'Todos os consultórios devem seguir o novo protocolo a partir de segunda-feira. Documento em anexo.', urgency: 'important' as const, time: 'Há 1 dia', unread: true, attachment: true },
  { title: 'Sistema fora do ar — manutenção', body: 'O sistema ficará indisponível no domingo das 02h às 06h para manutenção programada.', urgency: 'urgent' as const, time: 'Há 3 dias', unread: false },
]

const alerts = [
  { text: 'Paciente João Silva aguardando há 25 minutos (Sala de Espera)', type: 'urgent' },
  { text: '3 agendamentos sem confirmação nas últimas 2 horas', type: 'warning' },
  { text: '2 cobranças pendentes de confirmação de pagamento', type: 'warning' },
]

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0]
  const { data: appointments = [] } = useAppointments(today + 'T00:00:00', today + 'T23:59:59')

  const totalAppointments = appointments.length
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length
  const pendingCount = appointments.filter(a => a.status === 'SCHEDULED').length
  const cancelledCount = appointments.filter(a => a.status === 'CANCELLED').length
  const confirmedPct = totalAppointments > 0 ? Math.round((confirmedCount / totalAppointments) * 100) : 0
  const cancelledPct = totalAppointments > 0 ? Math.round((cancelledCount / totalAppointments) * 100) : 0

  return (
    <div className="animate-fade-in">
      {/* Announcement Feed */}
      <div className="announcement-feed">
        <div className="announcement-feed-header">
          <Bell size={18} color="var(--color-accent-gold)" />
          <h3>Avisos da Clínica</h3>
        </div>
        {announcements.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <Bell size={36} />
            <p>Nenhum aviso no momento</p>
          </div>
        ) : (
          announcements.map((a, i) => (
            <div key={i} className={`announcement-item${a.unread ? ' unread' : ''}`}>
              <div className={`announcement-urgency ${a.urgency}`} />
              <div className="announcement-body">
                <h4>{a.title}</h4>
                <p>{a.body}</p>
                <div className="announcement-meta">
                  <span className="announcement-time">
                    {a.attachment && <Paperclip size={11} style={{ display: 'inline', marginRight: 4 }} />}
                    {a.time}
                  </span>
                  {a.unread && (
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                      Marcar como lido
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
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

      {/* Alerts */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Alertas Operacionais</h3>
        <div className="alerts-list">
          {alerts.map((alert, i) => (
            <div key={i} className={`alert-row${alert.type === 'urgent' ? ' urgent' : ''}`}>
              {alert.type === 'urgent'
                ? <XCircle size={18} color="var(--color-accent-danger)" />
                : <AlertTriangle size={18} color="var(--color-accent-warning)" />
              }
              <span className="alert-text">{alert.text}</span>
              <button className="btn btn-ghost btn-sm">Ver</button>
            </div>
          ))}
        </div>
      </div>

      {/* Waiting list */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="var(--color-accent-gold)" />
          Na Espera Agora
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { name: 'João Silva', service: 'Consulta Cardiológica', time: '14:30', wait: '25 min' },
            { name: 'Maria Oliveira', service: 'Exame Oftalmológico', time: '15:00', wait: '10 min' },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--color-border-default)' }}>
              <div className="avatar avatar-sm avatar-placeholder">{p.name.split(' ').map(n => n[0]).join('')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.service} — {p.time}</div>
              </div>
              <span className="badge badge-warning">{p.wait}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <h3 style={{ fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Ações Rápidas</h3>
      <div className="quick-actions">
        <button className="quick-action-btn">
          <Plus size={18} /> Novo Agendamento
        </button>
        <button className="quick-action-btn">
          <UserCheck size={18} /> Registrar Chegada
        </button>
        <button className="quick-action-btn">
          <Receipt size={18} /> Emitir Cobrança
        </button>
      </div>
    </div>
  )
}
