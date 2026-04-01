import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, UserCheck, MessageSquare, Search, Loader2 } from 'lucide-react'
import { useAppointments } from '../../hooks/useAppointments'
import { useProfessionals } from '../../hooks/useProfessionals'
import type { Appointment } from '../../hooks/useAppointments'

const timeSlots = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']

export default function AgendaPage() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showCancelled, setShowCancelled] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<null | Appointment>(null)

  const { data: professionals = [], isLoading: loadingProfs } = useProfessionals()
  const { data: appointments = [], isLoading: loadingAppts } = useAppointments(
    `${selectedDate}T00:00:00Z`, 
    `${selectedDate}T23:59:59Z`
  )

  const dayAppts = appointments.filter(
    a => showCancelled || a.status !== 'CANCELLED'
  )

  if (loadingProfs || loadingAppts) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Filters */}
      <div className="agenda-filters">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-icon btn-sm" style={{ border: '1px solid var(--color-border-default)' }}
            onClick={() => {
              const d = new Date(selectedDate); d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0])
            }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 500, minWidth: 160, textAlign: 'center' }}>
            {new Date(selectedDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button className="btn btn-icon btn-sm" style={{ border: '1px solid var(--color-border-default)' }}
            onClick={() => {
              const d = new Date(selectedDate); d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0])
            }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="search-input-wrapper" style={{ maxWidth: 200 }}>
          <Search size={16} />
          <input className="input-field" placeholder="Profissional..." />
        </div>

        <select className="input-field" style={{ width: 'auto' }}>
          <option>Todas as Salas</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)}
            style={{ accentColor: 'var(--color-accent-emerald)' }} />
          Exibir cancelados
        </label>

        <div style={{ marginLeft: 'auto' }}>
          <div className="view-toggle">
            {(['day', 'week', 'month'] as const).map(v => (
              <button key={v} className={v === view ? 'active' : ''} onClick={() => setView(v)}>
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid — Day View */}
      <div style={{ display: 'flex', gap: 0 }}>
        <div className="calendar-grid" style={{ flex: 1 }}>
          {/* Header */}
          <div className="calendar-header" style={{ '--cols': Math.max(1, professionals.length) } as React.CSSProperties}>
            <div className="calendar-header-cell" style={{ width: 60 }}>Hora</div>
            {professionals.length > 0 ? professionals.map((p: any, i: number) => (
              <div key={i} className="calendar-header-cell">{p.user?.name || 'Profissional'}</div>
            )) : <div className="calendar-header-cell">Nenhum profissional cadastrado</div>}
          </div>

          {/* Time rows */}
          <div className="calendar-body" style={{ position: 'relative' }}>
            {timeSlots.map((time, ri) => (
              <div key={ri} className="calendar-row" style={{ '--cols': Math.max(1, professionals.length) } as React.CSSProperties}>
                <div className="calendar-time-label">{time}</div>
                {professionals.map((_: any, ci: number) => (
                  <div key={ci} className="calendar-cell" />
                ))}
              </div>
            ))}

            {/* Appointment blocks overlaid */}
            {dayAppts.map((appt, ai) => {
              const profIndex = professionals.findIndex((p: any) => p.id === appt.professionalId);
              if (profIndex === -1) return null;
              
              const startHour = new Date(appt.startTime).getUTCHours();
              const startMin = new Date(appt.startTime).getUTCMinutes();
              const endHour = new Date(appt.endTime).getUTCHours();
              const endMin = new Date(appt.endTime).getUTCMinutes();
              
              const slotIndex = timeSlots.findIndex(t => {
                const [h, m] = t.split(':').map(Number);
                return h === startHour && m === startMin;
              });

              if (slotIndex === -1) return null;

              const durationSlots = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 30;

              return (
                <div
                  key={ai}
                  className={`appointment-block ${appt.status.toLowerCase()}`}
                  style={{
                    top: slotIndex * 48 + 2,
                    height: durationSlots * 48 - 4,
                    left: `calc(60px + ${profIndex} * ((100% - 60px) / ${professionals.length}) + 2px)`,
                    width: `calc((100% - 60px) / ${professionals.length} - 4px)`,
                  }}
                  onClick={() => setSelectedAppointment(appt)}
                >
                  <div className="patient-name">{appt.patient?.user?.name || 'Paciente'}</div>
                  <div className="service-name">{appt.service?.name || 'Serviço'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail Drawer */}
        {selectedAppointment && (
          <div style={{ width: 320, borderLeft: '1px solid var(--color-border-default)', padding: 'var(--space-6)', background: 'var(--color-bg-primary)', animation: 'slideInRight 250ms ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>Detalhes</h3>
              <button className="modal-close" onClick={() => setSelectedAppointment(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Paciente</span>
                <p style={{ fontWeight: 500 }}>{selectedAppointment.patient?.user?.name}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Serviço</span>
                <p style={{ fontWeight: 500 }}>{selectedAppointment.service?.name}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Status</span>
                <span className={`badge badge-${selectedAppointment.status === 'CONFIRMED' ? 'emerald' : selectedAppointment.status === 'SCHEDULED' ? 'gold' : selectedAppointment.status === 'CANCELLED' ? 'danger' : 'muted'}`} style={{ display: 'block', width: 'fit-content', marginTop: 4 }}>
                  {selectedAppointment.status}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Profissional</span>
                <p style={{ fontWeight: 500 }}>{selectedAppointment.professional?.user?.name}</p>
              </div>

              <hr className="divider" />

              <button className="btn btn-primary btn-full">
                <UserCheck size={16} /> Check-in
              </button>
              <button className="btn btn-secondary btn-full">
                <MessageSquare size={16} /> Avisar Funcionário
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
