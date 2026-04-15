import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, UserCheck, MessageSquare, Search, Loader2, Plus, XCircle } from 'lucide-react'
import { useAppointments, useCreateAppointment, useCancelAppointment, useUpdateAppointmentStatus } from '../../hooks/useAppointments'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useServices } from '../../hooks/useServices'
import { usePatients } from '../../hooks/usePatients'
import ComboBox from '../../components/ComboBox'
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showCancelled, setShowCancelled] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<null | Appointment>(null)
  const [profSearch, setProfSearch] = useState('')
  const [profFilter, setProfFilter] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [formError, setFormError] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [drawerMsg, setDrawerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // New appointment form
  const [newForm, setNewForm] = useState({
    patientId: '',
    professionalId: '',
    serviceId: '',
    date: selectedDate,
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

  // Filter columns by search AND specialized filter
  const displayedProfs = professionals.filter(p => {
    const matchesSearch = !profSearch || (p.user?.name || '').toLowerCase().includes(profSearch.toLowerCase())
    const matchesFilter = !profFilter || p.id === profFilter
    return matchesSearch && matchesFilter
  })

  const dayAppts = appointments.filter(
    a => showCancelled || a.status !== 'CANCELLED'
  )

  const handleCellClick = (profId: string, time: string) => {
    setNewForm({
      ...newForm,
      professionalId: profId,
      startTime: time,
      date: selectedDate
    })
    setShowNewModal(true)
  }

  const handleCreateAppointment = async () => {
    setFormError('')
    if (!newForm.patientId || !newForm.professionalId || !newForm.serviceId) {
      setFormError('Preencha paciente, profissional e serviço.')
      return
    }
    try {
      await createAppointment.mutateAsync({
        patientId: newForm.patientId,
        professionalId: newForm.professionalId,
        serviceId: newForm.serviceId,
        startTime: `${newForm.date}T${newForm.startTime}:00`,
        endTime: `${newForm.date}T${newForm.startTime}:00`, // backend recalcula pelo serviço
        notes: newForm.notes || undefined,
        origin: 'RECEPTION',
        repeat: isRecurring, // Pass to backend expansion
      } as any)
      setShowNewModal(false)
      setIsRecurring(false)
      setNewForm({ patientId: '', professionalId: '', serviceId: '', date: selectedDate, startTime: '08:00', duration: '30', notes: '' })
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Erro ao criar agendamento.')
    }
  }

  const handleCheckin = async () => {
    if (!selectedAppointment) return
    setDrawerMsg(null)
    try {
      const nextStatus = selectedAppointment.status === 'CONFIRMED' ? 'IN_PROGRESS' : 'CONFIRMED'
      const updated = await updateStatus.mutateAsync({ id: selectedAppointment.id, status: nextStatus })
      setSelectedAppointment(updated)
      setDrawerMsg({ type: 'success', text: nextStatus === 'CONFIRMED' ? 'Chegada confirmada!' : 'Atendimento iniciado!' })
    } catch (err: any) {
      setDrawerMsg({ type: 'error', text: err?.response?.data?.message || 'Erro ao atualizar status. Tente novamente.' })
    }
  }

  const handleCancel = async () => {
    if (!selectedAppointment) return
    setDrawerMsg(null)
    try {
      await cancelAppointment.mutateAsync({ id: selectedAppointment.id, reason: cancelReason || 'Cancelado pela recepção' })
      setShowCancelConfirm(false)
      setCancelReason('')
      setSelectedAppointment(null)
    } catch (err: any) {
      setDrawerMsg({ type: 'error', text: err?.response?.data?.message || 'Erro ao cancelar. Tente novamente.' })
    }
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
              const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }}>
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            className="input-field"
            style={{ width: 'auto', padding: '4px 8px', height: 32, fontSize: 13, fontWeight: 500 }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <button className="btn btn-icon btn-sm" style={{ border: '1px solid var(--color-border-default)' }}
            onClick={() => {
              const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ width: 220 }}>
          <ComboBox
            placeholder="Filtrar por Profissional"
            options={professionals.map(p => ({ value: p.id, label: p.user?.name || 'Profissional' }))}
            value={profFilter}
            onChange={val => setProfFilter(val)}
          />
        </div>

        <div className="search-input-wrapper" style={{ maxWidth: 200 }}>
          <Search size={16} />
          <input
            className="input-field"
            placeholder="Busca rápida..."
            value={profSearch}
            onChange={e => setProfSearch(e.target.value)}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)}
            style={{ accentColor: 'var(--color-accent-emerald)' }} />
          Exibir cancelados
        </label>

        <button className="btn btn-primary btn-sm" onClick={() => setShowNewModal(true)} style={{ marginLeft: 'auto' }}>
          <Plus size={14} /> Novo Agendamento
        </button>
      </div>

      {/* Calendar Grid — Day View */}
      <div style={{ display: 'flex', gap: 0, overflow: 'hidden' }}>
        <div className="calendar-grid" style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div className="calendar-header" style={{ '--cols': Math.max(1, displayedProfs.length) } as React.CSSProperties}>
            <div className="calendar-header-cell" style={{ width: 60 }}>Hora</div>
            {displayedProfs.length > 0
              ? displayedProfs.map((p, i) => (
                  <div key={i} className="calendar-header-cell">{p.user?.name || 'Profissional'}</div>
                ))
              : <div className="calendar-header-cell">Nenhum profissional{profSearch ? ' encontrado' : ' cadastrado'}</div>}
          </div>

          {/* Time rows */}
          <div className="calendar-body" style={{ position: 'relative' }}>
            {timeSlots.map((time, ri) => (
              <div key={ri} className="calendar-row" style={{ '--cols': Math.max(1, displayedProfs.length) } as React.CSSProperties}>
                <div className="calendar-time-label">{time}</div>
                {displayedProfs.map((p, ci) => (
                  <div key={ci} className="calendar-cell" onClick={() => handleCellClick(p.id, time)} />
                ))}
              </div>
            ))}

            {/* Appointment blocks */}
            {dayAppts.map((appt, ai) => {
              const profIndex = displayedProfs.findIndex(p => p.id === appt.professionalId)
              if (profIndex === -1) return null

              // Remove timezone suffix to treat stored times as clinic local time
              const stripTz = (iso: string) => iso.replace('Z', '').replace(/\+\d{2}:\d{2}$/, '')
              const [startHour, startMin] = (stripTz(appt.startTime).split('T')[1] ?? '00:00').split(':').map(Number)
              const [endHour, endMin] = (stripTz(appt.endTime).split('T')[1] ?? '00:00').split(':').map(Number)

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
                    left: `calc(60px + ${profIndex} * ((100% - 60px) / ${displayedProfs.length}) + 2px)`,
                    width: `calc((100% - 60px) / ${displayedProfs.length} - 4px)`,
                  }}
                  onClick={() => { setSelectedAppointment(appt); setDrawerMsg(null) }}
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
          <div className="appointment-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>Detalhes</h3>
              <button className="modal-close" onClick={() => { setSelectedAppointment(null); setShowCancelConfirm(false) }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paciente</span>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedAppointment.patient?.user?.name || selectedAppointment.patient?.name || '—'}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Serviço</span>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedAppointment.service?.name || '—'}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horário</span>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {new Date(selectedAppointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                  <span className={`badge badge-${selectedAppointment.status === 'CONFIRMED' ? 'emerald' : selectedAppointment.status === 'IN_PROGRESS' ? 'emerald' : selectedAppointment.status === 'COMPLETED' ? 'muted' : selectedAppointment.status === 'SCHEDULED' ? 'gold' : selectedAppointment.status === 'CANCELLED' ? 'danger' : 'muted'}`} style={{ display: 'block', width: 'fit-content', marginTop: 4 }}>
                    {STATUS_LABEL[selectedAppointment.status] || selectedAppointment.status}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profissional</span>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedAppointment.professional?.user?.name || '—'}</p>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notas</span>
                  <p style={{ fontSize: 13, background: 'var(--color-bg-secondary)', padding: '8px 12px', borderRadius: 8, marginTop: 4 }}>{selectedAppointment.notes}</p>
                </div>
              )}

              <hr className="divider" />

              {drawerMsg && (
                <div style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 500,
                  background: drawerMsg.type === 'error' ? 'rgba(139,32,32,0.08)' : 'rgba(45,106,79,0.08)',
                  color: drawerMsg.type === 'error' ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)',
                  border: `1px solid ${drawerMsg.type === 'error' ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)'}`,
                }}>
                  {drawerMsg.text}
                </div>
              )}

              {selectedAppointment.status === 'SCHEDULED' && (
                <button className="btn btn-primary btn-full" onClick={handleCheckin} disabled={updateStatus.isPending}>
                  <UserCheck size={16} /> {updateStatus.isPending ? 'Atualizando...' : 'Confirmar Chegada'}
                </button>
              )}
              {selectedAppointment.status === 'CONFIRMED' && (
                <button className="btn btn-primary btn-full" onClick={handleCheckin} disabled={updateStatus.isPending}>
                  <UserCheck size={16} /> {updateStatus.isPending ? 'Atualizando...' : 'Iniciar Atendimento'}
                </button>
              )}
              {selectedAppointment.status === 'IN_PROGRESS' && (
                <button className="btn btn-primary btn-full" onClick={async () => {
                  setDrawerMsg(null)
                  try {
                    const updated = await updateStatus.mutateAsync({ id: selectedAppointment.id, status: 'COMPLETED' })
                    setSelectedAppointment(updated)
                    setDrawerMsg({ type: 'success', text: 'Atendimento finalizado!' })
                  } catch (err: any) {
                    setDrawerMsg({ type: 'error', text: err?.response?.data?.message || 'Erro ao finalizar. Tente novamente.' })
                  }
                }} disabled={updateStatus.isPending}>
                  <UserCheck size={16} /> {updateStatus.isPending ? 'Atualizando...' : 'Finalizar Atendimento'}
                </button>
              )}

              <button className="btn btn-secondary btn-full">
                <MessageSquare size={16} /> Avisar Funcionario
              </button>

              {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && (
                <>
                  {showCancelConfirm ? (
                    <div style={{ background: 'rgba(139,32,32,0.05)', padding: 12, borderRadius: 12, border: '1px solid var(--color-accent-danger)' }}>
                      <input
                        className="input-field"
                        placeholder="Motivo (opcional)"
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        style={{ marginBottom: 8, fontSize: 13 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowCancelConfirm(false)} style={{ flex: 1 }}>Voltar</button>
                        <button className="btn btn-sm btn-danger" style={{ flex: 1.5 }} onClick={handleCancel} disabled={cancelAppointment.isPending}>
                          {cancelAppointment.isPending ? 'Cancelando...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent-danger)', marginTop: 8 }} onClick={() => setShowCancelConfirm(true)}>
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
                      <option key={p.id} value={p.id}>{p.user?.name || p.id}</option>
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

                <div className="input-group full-span" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={isRecurring}
                    onChange={e => setIsRecurring(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-accent-emerald)', cursor: 'pointer' }}
                  />
                  <label htmlFor="recurring" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                    Agendamento Recorrente (Repetir semanalmente por 90 dias)
                  </label>
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
