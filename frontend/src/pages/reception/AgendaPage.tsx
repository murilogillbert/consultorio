import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, UserCheck, MessageSquare, Search, Loader2, Plus, XCircle } from 'lucide-react'
import { useAppointments, useCreateAppointment, useCancelAppointment, useUpdateAppointmentStatus } from '../../hooks/useAppointments'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useServices } from '../../hooks/useServices'
import { usePatients } from '../../hooks/usePatients'
import type { Appointment } from '../../hooks/useAppointments'

const timeSlots = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em Atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

export default function AgendaPage() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showCancelled, setShowCancelled] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<null | Appointment>(null)
  const [profSearch, setProfSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [formError, setFormError] = useState('')

  // New appointment form
  const [newForm, setNewForm] = useState({
    patientId: '',
    professionalId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    duration: '30',
    notes: '',
  })

  const { data: professionals = [], isLoading: loadingProfs } = useProfessionals()
  const { data: appointments = [], isLoading: loadingAppts } = useAppointments(
    `${selectedDate}T00:00:00`,
    `${selectedDate}T23:59:59`
  )
  const { data: services = [] } = useServices()
  const { data: patients = [] } = usePatients()

  const createAppointment = useCreateAppointment()
  const cancelAppointment = useCancelAppointment()
  const updateStatus = useUpdateAppointmentStatus()

  const filteredProfs = profSearch
    ? professionals.filter(p => (p.user?.name || '').toLowerCase().includes(profSearch.toLowerCase()))
    : professionals

  const dayAppts = appointments.filter(
    a => showCancelled || a.status !== 'CANCELLED'
  )

  const handleCreateAppointment = async () => {
    setFormError('')
    if (!newForm.patientId || !newForm.professionalId || !newForm.serviceId) {
      setFormError('Preencha paciente, profissional e serviço.')
      return
    }
    const [h, m] = newForm.startTime.split(':').map(Number)
    const startDt = new Date(`${newForm.date}T${newForm.startTime}:00`)
    const endDt = new Date(startDt.getTime() + parseInt(newForm.duration) * 60000)
    try {
      await createAppointment.mutateAsync({
        patientId: newForm.patientId,
        professionalId: newForm.professionalId,
        serviceId: newForm.serviceId,
        startTime: startDt.toISOString(),
        endTime: endDt.toISOString(),
        notes: newForm.notes || undefined,
        origin: 'RECEPTION',
      })
      setShowNewModal(false)
      setNewForm({ patientId: '', professionalId: '', serviceId: '', date: newForm.date, startTime: '08:00', duration: '30', notes: '' })
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Erro ao criar agendamento.')
    }
  }

  const handleCheckin = async () => {
    if (!selectedAppointment) return
    await updateStatus.mutateAsync({ id: selectedAppointment.id, status: 'CONFIRMED' })
    setSelectedAppointment(null)
  }

  const handleCancel = async () => {
    if (!selectedAppointment) return
    await cancelAppointment.mutateAsync({ id: selectedAppointment.id, reason: cancelReason || 'Cancelado pela recepção' })
    setShowCancelConfirm(false)
    setCancelReason('')
    setSelectedAppointment(null)
  }

  if (loadingProfs || loadingAppts) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <Loader2 className="animate-spin" size={48} color="var(--color-accent-emerald)" />
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
              const d = new Date(selectedDate); d.setDate(d.getDate() - 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 500, minWidth: 160, textAlign: 'center' }}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button className="btn btn-icon btn-sm" style={{ border: '1px solid var(--color-border-default)' }}
            onClick={() => {
              const d = new Date(selectedDate); d.setDate(d.getDate() + 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="search-input-wrapper" style={{ maxWidth: 200 }}>
          <Search size={16} />
          <input
            className="input-field"
            placeholder="Profissional..."
            value={profSearch}
            onChange={e => setProfSearch(e.target.value)}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)}
            style={{ accentColor: 'var(--color-accent-emerald)' }} />
          Exibir cancelados
        </label>

        <button className="btn btn-primary btn-sm" onClick={() => setShowNewModal(true)} style={{ marginLeft: 'auto' }}>
          <Plus size={14} /> Novo Agendamento
        </button>

        <div className="view-toggle">
          {(['day', 'week', 'month'] as const).map(v => (
            <button key={v} className={v === view ? 'active' : ''} onClick={() => setView(v)}>
              {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid — Day View */}
      <div style={{ display: 'flex', gap: 0 }}>
        <div className="calendar-grid" style={{ flex: 1 }}>
          {/* Header */}
          <div className="calendar-header" style={{ '--cols': Math.max(1, filteredProfs.length) } as React.CSSProperties}>
            <div className="calendar-header-cell" style={{ width: 60 }}>Hora</div>
            {filteredProfs.length > 0
              ? filteredProfs.map((p, i) => (
                  <div key={i} className="calendar-header-cell">{p.user?.name || 'Profissional'}</div>
                ))
              : <div className="calendar-header-cell">Nenhum profissional{profSearch ? ' encontrado' : ' cadastrado'}</div>}
          </div>

          {/* Time rows */}
          <div className="calendar-body" style={{ position: 'relative' }}>
            {timeSlots.map((time, ri) => (
              <div key={ri} className="calendar-row" style={{ '--cols': Math.max(1, filteredProfs.length) } as React.CSSProperties}>
                <div className="calendar-time-label">{time}</div>
                {filteredProfs.map((_, ci) => (
                  <div key={ci} className="calendar-cell" />
                ))}
              </div>
            ))}

            {/* Appointment blocks */}
            {dayAppts.map((appt, ai) => {
              const profIndex = filteredProfs.findIndex(p => p.id === appt.professionalId)
              if (profIndex === -1) return null

              const startDate = new Date(appt.startTime)
              const endDate = new Date(appt.endTime)
              const startHour = startDate.getHours()
              const startMin = startDate.getMinutes()
              const endHour = endDate.getHours()
              const endMin = endDate.getMinutes()

              const slotIndex = timeSlots.findIndex(t => {
                const [h, m] = t.split(':').map(Number)
                return h === startHour && m === startMin
              })
              if (slotIndex === -1) return null

              const durationSlots = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 30

              return (
                <div
                  key={ai}
                  className={`appointment-block ${appt.status.toLowerCase()}`}
                  style={{
                    top: slotIndex * 48 + 2,
                    height: Math.max(1, durationSlots) * 48 - 4,
                    left: `calc(60px + ${profIndex} * ((100% - 60px) / ${filteredProfs.length}) + 2px)`,
                    width: `calc((100% - 60px) / ${filteredProfs.length} - 4px)`,
                  }}
                  onClick={() => setSelectedAppointment(appt)}
                >
                  <div className="patient-name">{appt.patient?.user?.name || appt.patient?.name || 'Paciente'}</div>
                  <div className="service-name">{appt.service?.name || 'Serviço'}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail Drawer */}
        {selectedAppointment && (
          <div style={{ width: 320, borderLeft: '1px solid var(--color-border-default)', padding: 'var(--space-6)', background: 'var(--color-bg-primary)', animation: 'slideInRight 250ms ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>Detalhes</h3>
              <button className="modal-close" onClick={() => { setSelectedAppointment(null); setShowCancelConfirm(false) }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Paciente</span>
                <p style={{ fontWeight: 500 }}>{selectedAppointment.patient?.user?.name || selectedAppointment.patient?.name || '—'}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Serviço</span>
                <p style={{ fontWeight: 500 }}>{selectedAppointment.service?.name || '—'}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Horário</span>
                <p style={{ fontWeight: 500 }}>
                  {new Date(selectedAppointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {new Date(selectedAppointment.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Status</span>
                <span className={`badge badge-${selectedAppointment.status === 'CONFIRMED' ? 'emerald' : selectedAppointment.status === 'SCHEDULED' ? 'gold' : selectedAppointment.status === 'CANCELLED' ? 'danger' : 'muted'}`} style={{ display: 'block', width: 'fit-content', marginTop: 4 }}>
                  {STATUS_LABEL[selectedAppointment.status] || selectedAppointment.status}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Profissional</span>
                <p style={{ fontWeight: 500 }}>{selectedAppointment.professional?.user?.name || '—'}</p>
              </div>

              <hr className="divider" />

              {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && (
                <button
                  className="btn btn-primary btn-full"
                  onClick={handleCheckin}
                  disabled={updateStatus.isPending}
                >
                  <UserCheck size={16} /> {selectedAppointment.status === 'SCHEDULED' ? 'Confirmar Chegada' : 'Check-in'}
                </button>
              )}
              <button className="btn btn-secondary btn-full">
                <MessageSquare size={16} /> Avisar Funcionário
              </button>

              {selectedAppointment.status !== 'CANCELLED' && (
                <>
                  {showCancelConfirm ? (
                    <div>
                      <input
                        className="input-field"
                        placeholder="Motivo (opcional)"
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        style={{ marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowCancelConfirm(false)}>Voltar</button>
                        <button className="btn btn-sm" style={{ background: 'var(--color-accent-danger)', color: '#fff' }} onClick={handleCancel} disabled={cancelAppointment.isPending}>
                          Confirmar Cancelamento
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent-danger)' }} onClick={() => setShowCancelConfirm(true)}>
                      <XCircle size={14} /> Cancelar Agendamento
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo Agendamento</h3>
              <button className="modal-close" onClick={() => setShowNewModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-2col">
                <div className="input-group full-span">
                  <label className="input-label">Paciente <span className="required">*</span></label>
                  <select className="input-field" value={newForm.patientId} onChange={e => setNewForm({ ...newForm, patientId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.user?.name || p.name || p.id}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Profissional <span className="required">*</span></label>
                  <select className="input-field" value={newForm.professionalId} onChange={e => setNewForm({ ...newForm, professionalId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {professionals.map(p => (
                      <option key={p.id} value={p.id}>{p.user?.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Serviço <span className="required">*</span></label>
                  <select className="input-field" value={newForm.serviceId} onChange={e => {
                    const svc = services.find(s => s.id === e.target.value)
                    setNewForm({ ...newForm, serviceId: e.target.value, duration: svc ? String(svc.duration) : newForm.duration })
                  }}>
                    <option value="">Selecione...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Data</label>
                  <input type="date" className="input-field" value={newForm.date} onChange={e => setNewForm({ ...newForm, date: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Horário de Início</label>
                  <select className="input-field" value={newForm.startTime} onChange={e => setNewForm({ ...newForm, startTime: e.target.value })}>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Duração (min)</label>
                  <input type="number" className="input-field" value={newForm.duration} onChange={e => setNewForm({ ...newForm, duration: e.target.value })} min={15} step={15} />
                </div>
                <div className="input-group full-span">
                  <label className="input-label">Observações</label>
                  <textarea className="input-field" value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })} style={{ minHeight: 60 }} />
                </div>
              </div>
              {formError && <p style={{ color: 'var(--color-accent-danger)', fontSize: 13, marginTop: 8 }}>{formError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateAppointment} disabled={createAppointment.isPending}>
                {createAppointment.isPending ? 'Salvando...' : 'Criar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
