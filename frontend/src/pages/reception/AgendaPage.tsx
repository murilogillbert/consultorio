import { useState, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, MessageSquare, Search, Loader2, Plus, DollarSign, Calendar, CalendarRange, Edit2, Trash2 } from 'lucide-react'
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointmentStatus,
  useCreateRecurringAppointments,
  useUpdateAppointment,
  useUpdatePatientConfirmation,
  useDeleteAppointmentPermanent,
  useDeleteFutureAppointments,
} from '../../hooks/useAppointments'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useServices } from '../../hooks/useServices'
import { usePatients } from '../../hooks/usePatients'
import { useNotifyStaffArrival } from '../../hooks/useChannels'
import ComboBox from '../../components/ComboBox'
import PaymentModal from '../../components/PaymentModal'
import type { Appointment } from '../../hooks/useAppointments'

const timeSlots = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']

// Status disponíveis no seletor (ordem de exibição).
// "Desmarcado pelo paciente" (NO_SHOW) mantém o horário ocupado — o paciente
// não compareceu/desmarcou, mas o slot aconteceu e fica registrado no histórico.
// O status "Cancelado" foi removido do fluxo: para liberar/remover um
// agendamento usa-se a ação de Excluir (apaga do banco) em vez de cancelar
// (que mantinha em cinza). Isso evita confusão entre "cancelar" e "excluir".
const STATUS_OPTIONS: { value: string; label: string; tone: string }[] = [
  { value: 'SCHEDULED',   label: 'Agendado',                  tone: 'gold' },
  { value: 'CONFIRMED',   label: 'Confirmado',                tone: 'emerald' },
  { value: 'IN_PROGRESS', label: 'Em Atendimento',            tone: 'emerald' },
  { value: 'COMPLETED',   label: 'Realizado',                 tone: 'emerald' },
  { value: 'NO_SHOW',     label: 'Desmarcado pelo paciente',  tone: 'muted' },
]

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map(o => [o.value, o.label])
)

const CONFIRMATION_OPTIONS: { value: 'PENDING' | 'CONFIRMED' | 'NOT_CONFIRMED'; label: string; tone: string }[] = [
  { value: 'PENDING',       label: 'Pendente',      tone: 'muted' },
  { value: 'CONFIRMED',     label: 'Confirmado',    tone: 'emerald' },
  { value: 'NOT_CONFIRMED', label: 'Não confirmado', tone: 'danger' },
]

// Calcula segunda-feira da semana de uma data (ISO week, Mon=início).
function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dow = x.getDay() // 0=Sun..6=Sat
  const diff = (dow === 0 ? -6 : 1 - dow)
  x.setDate(x.getDate() + diff)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

interface FormState {
  patientId: string
  professionalId: string
  serviceId: string
  date: string
  startTime: string
  duration: string
  notes: string
  appointmentType: 'ONLINE' | 'IN_PERSON'
}

export default function AgendaPage() {
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [showCancelled, setShowCancelled] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<null | Appointment>(null)
  const [profSearch, setProfSearch] = useState('')
  const [profFilter, setProfFilter] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Estados do modal de exclusão. "deleteScope" é a escolha entre apagar
  // só este agendamento ou ele e todos os futuros da mesma série de
  // recorrência. Para agendamentos sem recurrenceGroupId, deleteScope
  // sempre fica como 'one'.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteScope, setDeleteScope] = useState<'one' | 'future'>('one')
  const [formError, setFormError] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [drawerMsg, setDrawerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const emptyForm: FormState = {
    patientId: '',
    professionalId: '',
    serviceId: '',
    date: selectedDate,
    startTime: '08:00',
    duration: '30',
    notes: '',
    appointmentType: 'IN_PERSON',
  }
  const [form, setForm] = useState<FormState>(emptyForm)

  // Range da consulta de agendamentos: cobre o dia inteiro ou a semana inteira.
  const queryRange = useMemo(() => {
    if (viewMode === 'day') {
      return { start: `${selectedDate}T00:00:00`, end: `${selectedDate}T23:59:59` }
    }
    const base = new Date(selectedDate + 'T12:00:00')
    const wStart = startOfWeek(base)
    const wEnd = addDays(wStart, 6)
    return {
      start: `${fmtDate(wStart)}T00:00:00`,
      end: `${fmtDate(wEnd)}T23:59:59`,
    }
  }, [selectedDate, viewMode])

  const { data: professionals = [], isLoading: loadingProfs } = useProfessionals()
  const { data: appointments = [], isLoading: loadingAppts, refetch: refetchAppointments } = useAppointments(
    queryRange.start,
    queryRange.end
  )
  const { data: services = [] } = useServices()
  const { data: patients = [] } = usePatients()

  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()
  const deleteFuture = useDeleteFutureAppointments()
  const deleteAppointment = useDeleteAppointmentPermanent()
  const updateStatus = useUpdateAppointmentStatus()
  const updateConfirmation = useUpdatePatientConfirmation()
  const createRecurring = useCreateRecurringAppointments()
  const notifyStaff = useNotifyStaffArrival()

  // Filtro de profissionais (busca + dropdown).
  const displayedProfs = useMemo(() => professionals.filter(p => {
    const matchesSearch = !profSearch || (p.user?.name || '').toLowerCase().includes(profSearch.toLowerCase())
    const matchesFilter = !profFilter || p.id === profFilter
    return matchesSearch && matchesFilter
  }), [professionals, profSearch, profFilter])

  // Apenas filtra cancelados se o toggle estiver desligado. Quando ligado,
  // mostra também os cancelados (em cinza) para preservar o histórico.
  const visibleAppts = useMemo(() => appointments.filter(a => showCancelled || a.status !== 'CANCELLED'), [appointments, showCancelled])

  const calendarColumnCount = Math.max(1, displayedProfs.length)
  const calendarMinWidth = Math.max(720, 60 + calendarColumnCount * 180)
  const selectedPaymentStatus = selectedAppointment?.paymentStatus
  const selectedIsPaid = selectedPaymentStatus === 'PAID'
  // Mantém a exibição de etiqueta para registros legados (CANCELLED ainda
  // pode aparecer em dados históricos, mesmo após a remoção do fluxo de
  // cancelamento da UI).
  const selectedIsCancelled = selectedAppointment?.status === 'CANCELLED'
  const cancellationLabel = selectedIsCancelled
    ? (selectedAppointment?.cancellationSource === 'PATIENT'
      ? 'Cancelado pelo paciente'
      : selectedAppointment?.cancellationSource === 'RECEPTION'
        ? 'Cancelado pela recepção'
        : selectedAppointment?.cancellationSource === 'PROFESSIONAL'
          ? 'Cancelado pelo profissional'
          : 'Cancelado')
    : ''

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const openNewModal = (overrides?: Partial<FormState>) => {
    setEditingId(null)
    setForm({ ...emptyForm, date: selectedDate, ...overrides })
    setFormError('')
    setIsRecurring(false)
    setShowFormModal(true)
  }

  const openEditModal = (appt: Appointment) => {
    const start = new Date(appt.startTime)
    const end = new Date(appt.endTime)
    const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
    const duration = String(Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)))
    setEditingId(appt.id)
    setForm({
      patientId: appt.patientId,
      professionalId: appt.professionalId,
      serviceId: appt.serviceId,
      date,
      startTime: time,
      duration,
      notes: appt.notes || '',
      appointmentType: (appt.appointmentType === 'ONLINE' ? 'ONLINE' : 'IN_PERSON'),
    })
    setFormError('')
    setIsRecurring(false)
    setShowFormModal(true)
  }

  const handleCellClick = (profId: string, time: string, date?: string) => {
    openNewModal({ professionalId: profId, startTime: time, date: date || selectedDate })
  }

  const handleSubmitForm = async () => {
    setFormError('')
    if (!form.patientId || !form.professionalId || !form.serviceId) {
      setFormError('Preencha paciente, profissional e serviço.')
      return
    }
    try {
      const startIso = `${form.date}T${form.startTime}:00`
      if (editingId) {
        // Edição: usa PUT /appointments/:id (backend recalcula endTime pelo serviço).
        const updated = await updateAppointment.mutateAsync({
          id: editingId,
          patientId: form.patientId,
          professionalId: form.professionalId,
          serviceId: form.serviceId,
          startTime: startIso,
          notes: form.notes || undefined,
          appointmentType: form.appointmentType,
        })
        setSelectedAppointment(updated)
        setShowFormModal(false)
        setDrawerMsg({ type: 'success', text: 'Agendamento atualizado.' })
        return
      }
      if (isRecurring) {
        const result = await createRecurring.mutateAsync({
          patientId: form.patientId,
          professionalId: form.professionalId,
          serviceId: form.serviceId,
          startTime: startIso,
          notes: form.notes || undefined,
          durationDays: 90,
          appointmentType: form.appointmentType,
        })
        if (result.skipped > 0) {
          const skippedList = result.skippedDates.map(d => new Date(d).toLocaleDateString('pt-BR')).join(', ')
          setFormError(`${result.message} Datas em conflito: ${skippedList}`)
          return
        }
      } else {
        await createAppointment.mutateAsync({
          patientId: form.patientId,
          professionalId: form.professionalId,
          serviceId: form.serviceId,
          startTime: startIso,
          endTime: startIso, // backend recalcula pelo serviço
          notes: form.notes || undefined,
          origin: 'RECEPTION',
          appointmentType: form.appointmentType,
        })
      }
      setShowFormModal(false)
      setIsRecurring(false)
      setForm(emptyForm)
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Erro ao salvar agendamento.')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedAppointment) return
    setDrawerMsg(null)
    try {
      const updated = await updateStatus.mutateAsync({ id: selectedAppointment.id, status: newStatus })
      setSelectedAppointment(updated)
      setDrawerMsg({ type: 'success', text: `Status atualizado para ${STATUS_LABEL[newStatus] || newStatus}.` })
    } catch (err: any) {
      setDrawerMsg({ type: 'error', text: err?.response?.data?.message || 'Erro ao atualizar status.' })
    }
  }

  const handleConfirmationChange = async (value: 'PENDING' | 'CONFIRMED' | 'NOT_CONFIRMED') => {
    if (!selectedAppointment) return
    setDrawerMsg(null)
    try {
      const updated = await updateConfirmation.mutateAsync({ id: selectedAppointment.id, value })
      setSelectedAppointment(updated)
      setDrawerMsg({ type: 'success', text: 'Confirmação atualizada.' })
    } catch (err: any) {
      setDrawerMsg({ type: 'error', text: err?.response?.data?.message || 'Erro ao atualizar confirmação.' })
    }
  }

  // Exclui o agendamento. Se selectedAppointment tem recurrenceGroupId e o
  // usuário escolheu 'future', apaga este e todos os futuros da série.
  // Caso contrário, apaga apenas este. Em ambos os casos é um DELETE real
  // no banco (não cancelamento).
  const handleDeleteConfirmed = async () => {
    if (!selectedAppointment) return
    setDrawerMsg(null)
    try {
      if (deleteScope === 'future' && selectedAppointment.recurrenceGroupId) {
        const result = await deleteFuture.mutateAsync(selectedAppointment.id)
        setShowDeleteConfirm(false)
        setSelectedAppointment(null)
        setDeleteScope('one')
        setDrawerMsg({ type: 'success', text: result.message })
        return
      }
      await deleteAppointment.mutateAsync(selectedAppointment.id)
      setShowDeleteConfirm(false)
      setSelectedAppointment(null)
      setDeleteScope('one')
    } catch (err: any) {
      setDrawerMsg({ type: 'error', text: err?.response?.data?.message || 'Erro ao excluir agendamento.' })
    }
  }

  if (loadingProfs || loadingAppts) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <Loader2 className="animate-spin" size={48} color="var(--color-accent-emerald)" />
      </div>
    )
  }

  // ─── Renderização ───────────────────────────────────────────────────────────

  const stripTz = (iso: string) => iso.replace('Z', '').replace(/\+\d{2}:\d{2}$/, '')

  return (
    <div className="animate-fade-in agenda-page-layout">
      {/* Filters */}
      <div className="agenda-filters">
        <div className="agenda-filter-top">
          <button className="btn btn-icon btn-sm" style={{ border: '1px solid var(--color-border-default)', flexShrink: 0 }}
            onClick={() => {
              const d = new Date(selectedDate + 'T12:00:00')
              d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1))
              setSelectedDate(fmtDate(d))
            }}>
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            className="input-field"
            style={{ flex: '1 1 auto', minWidth: 0, padding: '4px 8px', height: 32, fontSize: 13, fontWeight: 500 }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <button className="btn btn-icon btn-sm" style={{ border: '1px solid var(--color-border-default)', flexShrink: 0 }}
            onClick={() => {
              const d = new Date(selectedDate + 'T12:00:00')
              d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1))
              setSelectedDate(fmtDate(d))
            }}>
            <ChevronRight size={16} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ flexShrink: 0 }}
            onClick={() => setSelectedDate(today)}
            title="Voltar para hoje"
          >
            Hoje
          </button>
          <button className="btn btn-primary btn-sm agenda-new-desktop" onClick={() => openNewModal()}>
            <Plus size={14} /> Novo Agendamento
          </button>
        </div>

        <div className="agenda-filter-bottom">
          {/* Toggle de visão dia/semana */}
          <div className="agenda-view-toggle" style={{ display: 'inline-flex', border: '1px solid var(--color-border-default)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              className="btn btn-sm"
              style={{
                background: viewMode === 'day' ? 'var(--color-accent-emerald)' : 'transparent',
                color: viewMode === 'day' ? 'white' : 'var(--color-text-secondary)',
                border: 'none', borderRadius: 0,
              }}
              onClick={() => setViewMode('day')}
            >
              <Calendar size={14} /> Dia
            </button>
            <button
              className="btn btn-sm"
              style={{
                background: viewMode === 'week' ? 'var(--color-accent-emerald)' : 'transparent',
                color: viewMode === 'week' ? 'white' : 'var(--color-text-secondary)',
                border: 'none', borderRadius: 0,
              }}
              onClick={() => setViewMode('week')}
            >
              <CalendarRange size={14} /> Semana
            </button>
          </div>

          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <ComboBox
              placeholder="Filtrar profissional"
              options={professionals.map(p => ({ value: p.id, label: p.user?.name || 'Profissional' }))}
              value={profFilter}
              onChange={val => setProfFilter(val)}
            />
          </div>

          <div className="search-input-wrapper" style={{ flex: '1 1 160px', maxWidth: 200 }}>
            <Search size={16} />
            <input
              className="input-field"
              placeholder="Busca rápida..."
              value={profSearch}
              onChange={e => setProfSearch(e.target.value)}
            />
          </div>

          <label className="agenda-cancelled-label">
            <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)}
              style={{ accentColor: 'var(--color-accent-emerald)' }} />
            Cancelados
          </label>
        </div>
      </div>

      <button className="agenda-fab" onClick={() => openNewModal()} aria-label="Novo Agendamento">
        <Plus size={22} />
      </button>

      {/* Calendar Grid */}
      <div className="agenda-main-layout" style={{ display: 'flex', gap: 0, position: 'relative' }}>
        <div className="agenda-desktop-view">
          {viewMode === 'day' ? (
            <DayGrid
              displayedProfs={displayedProfs}
              visibleAppts={visibleAppts}
              calendarColumnCount={calendarColumnCount}
              calendarMinWidth={calendarMinWidth}
              stripTz={stripTz}
              onCellClick={handleCellClick}
              onAppointmentClick={(a) => { setSelectedAppointment(a); setDrawerMsg(null) }}
            />
          ) : (
            <WeekGrid
              selectedDate={selectedDate}
              displayedProfs={displayedProfs}
              visibleAppts={visibleAppts}
              stripTz={stripTz}
              onCellClick={(profId, time, date) => handleCellClick(profId, time, date)}
              onAppointmentClick={(a) => { setSelectedAppointment(a); setDrawerMsg(null) }}
            />
          )}
        </div>

        <MobileDayList
          selectedDate={selectedDate}
          displayedProfs={displayedProfs}
          visibleAppts={visibleAppts}
          stripTz={stripTz}
          onAppointmentClick={(a) => { setSelectedAppointment(a); setDrawerMsg(null) }}
          onPrev={() => {
            const d = new Date(selectedDate + 'T12:00:00')
            d.setDate(d.getDate() - 1)
            setSelectedDate(fmtDate(d))
          }}
          onNext={() => {
            const d = new Date(selectedDate + 'T12:00:00')
            d.setDate(d.getDate() + 1)
            setSelectedDate(fmtDate(d))
          }}
          onNew={() => openNewModal()}
        />

        {/* Detail Drawer */}
        {selectedAppointment && (
          <>
          <div className="agenda-drawer-backdrop" onClick={() => setSelectedAppointment(null)} />
          <div className="appointment-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>Detalhes</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-icon btn-sm" title="Editar" onClick={() => openEditModal(selectedAppointment)}>
                  <Edit2 size={16} />
                </button>
                <button className="modal-close" onClick={() => setSelectedAppointment(null)}>
                  <X size={18} />
                </button>
              </div>
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
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data/Hora</span>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {new Date(stripTz(selectedAppointment.startTime)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {' '}
                    {new Date(stripTz(selectedAppointment.startTime)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modalidade</span>
                  <span className={`badge badge-${selectedAppointment.appointmentType === 'ONLINE' ? 'emerald' : 'gold'}`} style={{ display: 'block', width: 'fit-content', marginTop: 4 }}>
                    {selectedAppointment.appointmentType === 'ONLINE' ? 'Online' : 'Presencial'}
                  </span>
                </div>
              </div>

              {/* Status como dropdown (substitui os botões soltos) */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                <select
                  className="input-field"
                  style={{ marginTop: 4, fontWeight: 600 }}
                  value={selectedAppointment.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={updateStatus.isPending}
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {selectedIsCancelled && (
                  <span style={{ fontSize: 11, color: 'var(--color-accent-danger)', marginTop: 4, display: 'block' }}>
                    {cancellationLabel}
                  </span>
                )}
              </div>

              {/* Confirmação do paciente — independente do status */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmação do paciente</span>
                <select
                  className="input-field"
                  style={{ marginTop: 4 }}
                  value={selectedAppointment.patientConfirmation || 'PENDING'}
                  onChange={e => handleConfirmationChange(e.target.value as any)}
                  disabled={updateConfirmation.isPending}
                >
                  {CONFIRMATION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cobrança</span>
                <span className={`badge badge-${selectedIsPaid ? 'emerald' : selectedPaymentStatus === 'PENDING' ? 'gold' : 'muted'}`} style={{ display: 'block', width: 'fit-content', marginTop: 4 }}>
                  {selectedIsPaid ? 'Pago' : selectedPaymentStatus === 'PENDING' ? 'Pendente' : 'Não cobrado'}
                </span>
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

              <hr className="divider" />

              {!selectedIsCancelled && selectedAppointment.status !== 'COMPLETED' && (
                <button
                  className="btn btn-full"
                  style={{
                    background: selectedIsPaid ? 'var(--color-bg-secondary)' : '#16A34A',
                    color: selectedIsPaid ? 'var(--color-text-muted)' : 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                  onClick={() => { if (!selectedIsPaid) setShowPaymentModal(true) }}
                  disabled={selectedIsPaid}
                >
                  <DollarSign size={16} /> {selectedIsPaid ? 'Cobrança já registrada' : 'Registrar Cobrança'}
                </button>
              )}

              <button
                className="btn btn-secondary btn-full"
                onClick={async () => {
                  if (!selectedAppointment) return
                  setDrawerMsg(null)
                  try {
                    await notifyStaff.mutateAsync({ appointmentId: selectedAppointment.id })
                    setDrawerMsg({ type: 'success', text: 'Funcionário avisado com sucesso.' })
                  } catch (err: any) {
                    setDrawerMsg({ type: 'error', text: err?.response?.data?.message || 'Erro ao avisar o funcionário.' })
                  }
                }}
                disabled={notifyStaff.isPending}
              >
                <MessageSquare size={16} /> {notifyStaff.isPending ? 'Avisando...' : 'Avisar Funcionário'}
              </button>

              {/* Excluir = remoção real do banco (cancelamento foi removido
                  do fluxo). Para séries de recorrência o usuário escolhe
                  no próprio modal se apaga só este ou todos os futuros. */}
              {selectedAppointment.status !== 'COMPLETED' && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-accent-danger)', marginTop: 8 }}
                  onClick={() => {
                    setDeleteScope('one')
                    setShowDeleteConfirm(true)
                  }}
                >
                  <Trash2 size={14} /> Excluir Agendamento
                </button>
              )}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Confirmação de exclusão permanente — quando o agendamento faz
          parte de uma recorrência, oferece a escolha "este apenas" vs
          "este e todos os futuros". */}
      {showDeleteConfirm && selectedAppointment && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={18} color="var(--color-accent-danger)" /> Excluir Agendamento
              </h3>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {selectedAppointment.recurrenceGroupId && (
                <>
                  <p style={{ fontSize: 13, marginBottom: 12 }}>
                    Este agendamento faz parte de uma recorrência. Como deseja excluir?
                  </p>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, border: '1px solid var(--color-border-default)', borderRadius: 8, marginBottom: 8, cursor: 'pointer', background: deleteScope === 'one' ? 'rgba(45,106,79,0.05)' : 'transparent' }}>
                    <input
                      type="radio"
                      checked={deleteScope === 'one'}
                      onChange={() => setDeleteScope('one')}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Excluir apenas este</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Mantém os demais agendamentos da série.</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, border: '1px solid var(--color-border-default)', borderRadius: 8, marginBottom: 12, cursor: 'pointer', background: deleteScope === 'future' ? 'rgba(139,32,32,0.05)' : 'transparent' }}>
                    <input
                      type="radio"
                      checked={deleteScope === 'future'}
                      onChange={() => setDeleteScope('future')}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Excluir este e todos os futuros</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Apaga todas as próximas ocorrências da série. Não afeta as passadas.</div>
                    </div>
                  </label>
                </>
              )}
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Esta ação <strong>não pode ser desfeita</strong>. O agendamento e seus registros relacionados
                (cobrança, uso de equipamento) serão removidos do banco.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Voltar</button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteConfirmed}
                disabled={deleteAppointment.isPending || deleteFuture.isPending}
              >
                {(deleteAppointment.isPending || deleteFuture.isPending) ? 'Excluindo...' : 'Excluir Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedAppointment && (
        <PaymentModal
          appointmentId={selectedAppointment.id}
          serviceName={selectedAppointment.service?.name || 'Consulta'}
          servicePrice={Math.round((selectedAppointment.service?.price ?? 0) * 100)}
          appointmentStatus={selectedAppointment.status}
          paymentStatus={selectedAppointment.paymentStatus}
          onClose={() => setShowPaymentModal(false)}
          onPaid={() => {
            setShowPaymentModal(false)
            setDrawerMsg({ type: 'success', text: 'Pagamento registrado com sucesso!' })
            void refetchAppointments()
          }}
        />
      )}

      {/* Form modal — criar ou editar */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
              <button className="modal-close" onClick={() => setShowFormModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-2col">
                <div className="input-group full-span">
                  <label className="input-label">Paciente <span className="required">*</span></label>
                  <select className="input-field" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.user?.name || p.id}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Profissional <span className="required">*</span></label>
                  <select className="input-field" value={form.professionalId} onChange={e => setForm({ ...form, professionalId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {professionals.map(p => (
                      <option key={p.id} value={p.id}>{p.user?.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Serviço <span className="required">*</span></label>
                  <select className="input-field" value={form.serviceId} onChange={e => {
                    const svc = services.find(s => s.id === e.target.value)
                    setForm({ ...form, serviceId: e.target.value, duration: svc ? String(svc.duration) : form.duration })
                  }}>
                    <option value="">Selecione...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Tipo de atendimento</label>
                  <select className="input-field" value={form.appointmentType} onChange={e => setForm({ ...form, appointmentType: e.target.value as 'ONLINE' | 'IN_PERSON' })}>
                    <option value="IN_PERSON">Presencial</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Data</label>
                  <input type="date" className="input-field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Horário de Início</label>
                  <select className="input-field" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Duração (min)</label>
                  <select
                    className="input-field"
                    value={[15, 30, 45, 60, 90, 120].includes(parseInt(form.duration)) ? form.duration : 'custom'}
                    onChange={e => {
                      if (e.target.value === 'custom') return
                      setForm({ ...form, duration: e.target.value })
                    }}
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min (1h)</option>
                    <option value="90">90 min (1h30)</option>
                    <option value="120">120 min (2h)</option>
                    <option value="custom">Outro...</option>
                  </select>
                  {!['15', '30', '45', '60', '90', '120'].includes(form.duration) && (
                    <input
                      type="number"
                      className="input-field"
                      style={{ marginTop: 6 }}
                      placeholder="Duração customizada (min)"
                      value={form.duration}
                      onChange={e => setForm({ ...form, duration: e.target.value })}
                      min={5}
                      step={5}
                    />
                  )}
                </div>
                <div className="input-group full-span">
                  <label className="input-label">Observações</label>
                  <textarea className="input-field" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ minHeight: 60 }} />
                </div>

                {!editingId && (
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
                )}
              </div>
              {formError && <p style={{ color: 'var(--color-accent-danger)', fontSize: 13, marginTop: 8 }}>{formError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitForm}
                disabled={createAppointment.isPending || updateAppointment.isPending || createRecurring.isPending}
              >
                {createAppointment.isPending || updateAppointment.isPending || createRecurring.isPending
                  ? 'Salvando...'
                  : editingId ? 'Salvar Alterações' : 'Criar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Day Grid (visão diária) ──────────────────────────────────────────────────

interface DayGridProps {
  displayedProfs: any[]
  visibleAppts: Appointment[]
  calendarColumnCount: number
  calendarMinWidth: number
  stripTz: (iso: string) => string
  onCellClick: (profId: string, time: string) => void
  onAppointmentClick: (a: Appointment) => void
}

function DayGrid({ displayedProfs, visibleAppts, calendarColumnCount, calendarMinWidth, stripTz, onCellClick, onAppointmentClick }: DayGridProps) {
  return (
    <div
      className="calendar-grid"
      style={{
        flex: 1,
        minWidth: 0,
        '--cols': calendarColumnCount,
        '--calendar-min-width': `${calendarMinWidth}px`,
      } as React.CSSProperties}
    >
      <div className="calendar-header">
        <div className="calendar-header-cell" style={{ width: 60 }}>Hora</div>
        {displayedProfs.length > 0
          ? displayedProfs.map((p, i) => (
              <div key={i} className="calendar-header-cell">{p.user?.name || 'Profissional'}</div>
            ))
          : <div className="calendar-header-cell">Nenhum profissional cadastrado</div>}
      </div>

      <div className="calendar-body" style={{ position: 'relative' }}>
        {timeSlots.map((time, ri) => (
          <div key={ri} className="calendar-row">
            <div className="calendar-time-label">{time}</div>
            {displayedProfs.map((p, ci) => (
              <div key={ci} className="calendar-cell" onClick={() => onCellClick(p.id, time)} />
            ))}
          </div>
        ))}

        {visibleAppts.map((appt, ai) => {
          const profIndex = displayedProfs.findIndex(p => p.id === appt.professionalId)
          if (profIndex === -1) return null

          const [startHour, startMin] = (stripTz(appt.startTime).split('T')[1] ?? '00:00').split(':').map(Number)
          const [endHour, endMin] = (stripTz(appt.endTime).split('T')[1] ?? '00:00').split(':').map(Number)

          const slotIndex = timeSlots.findIndex(t => {
            const [h, m] = t.split(':').map(Number)
            return h === startHour && m === startMin
          })
          if (slotIndex === -1) return null

          const durationSlots = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 30

          // Status agora aplicado puramente via CSS (.appointment-block.<status>).
          const cancelledByPatient = appt.status === 'CANCELLED' && appt.cancellationSource === 'PATIENT'
          const blockClass = `appointment-block ${appt.status.toLowerCase()}${cancelledByPatient ? ' cancelled-by-patient' : ''}`

          return (
            <div
              key={ai}
              className={blockClass}
              style={{
                top: slotIndex * 48 + 2,
                height: Math.max(1, durationSlots) * 48 - 4,
                left: `calc(60px + ${profIndex} * ((100% - 60px) / ${displayedProfs.length}) + 2px)`,
                width: `calc((100% - 60px) / ${displayedProfs.length} - 4px)`,
              }}
              onClick={() => onAppointmentClick(appt)}
            >
              <div className="patient-name">{appt.patient?.user?.name || appt.patient?.name || 'Paciente'}</div>
              <div className="service-name">{appt.service?.name || 'Serviço'}</div>
              <div className="service-name" style={{ fontSize: 11, opacity: 0.85 }}>
                {appt.appointmentType === 'ONLINE' ? 'Online' : 'Presencial'}
                {appt.patientConfirmation === 'CONFIRMED' ? ' • ✓' : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Mobile Day List (visão mobile: lista por dia + swipe) ───────────────────

interface MobileDayListProps {
  selectedDate: string
  displayedProfs: any[]
  visibleAppts: Appointment[]
  stripTz: (iso: string) => string
  onAppointmentClick: (a: Appointment) => void
  onPrev: () => void
  onNext: () => void
  onNew: () => void
}

function MobileDayList({
  selectedDate,
  displayedProfs,
  visibleAppts,
  stripTz,
  onAppointmentClick,
  onPrev,
  onNext,
  onNew,
}: MobileDayListProps) {
  const profIds = useMemo(() => new Set(displayedProfs.map(p => p.id)), [displayedProfs])

  const dayAppts = useMemo(() => {
    return visibleAppts
      .filter(a => profIds.size === 0 || profIds.has(a.professionalId))
      .filter(a => stripTz(a.startTime).split('T')[0] === selectedDate)
      .sort((a, b) => stripTz(a.startTime).localeCompare(stripTz(b.startTime)))
  }, [visibleAppts, profIds, selectedDate, stripTz])

  const dateObj = new Date(selectedDate + 'T12:00:00')
  const dayLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  const touchStart = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null || touchStartY.current == null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Trata como swipe horizontal apenas se for predominantemente lateral.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) onNext()
      else onPrev()
    }
    touchStart.current = null
    touchStartY.current = null
  }

  return (
    <div
      className="agenda-mobile-view"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="agenda-mobile-day-nav">
        <button className="btn btn-icon btn-sm" onClick={onPrev} aria-label="Dia anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="agenda-mobile-day-label">{dayLabel}</div>
        <button className="btn btn-icon btn-sm" onClick={onNext} aria-label="Próximo dia">
          <ChevronRight size={18} />
        </button>
      </div>

      {dayAppts.length === 0 ? (
        <div className="agenda-mobile-empty">
          <Calendar size={28} />
          <p style={{ margin: 0 }}>Nenhum agendamento neste dia.</p>
          <button className="btn btn-primary btn-sm" onClick={onNew}>
            <Plus size={14} /> Novo Agendamento
          </button>
          <span className="agenda-mobile-hint">Arraste para ver outro dia</span>
        </div>
      ) : (
        <ul className="agenda-mobile-list">
          {dayAppts.map(appt => {
            const start = new Date(stripTz(appt.startTime))
            const end = new Date(stripTz(appt.endTime))
            const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
            const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
            const cancelledByPatient = appt.status === 'CANCELLED' && appt.cancellationSource === 'PATIENT'
            const cardClass = `agenda-mobile-card ${appt.status.toLowerCase()}${cancelledByPatient ? ' cancelled-by-patient' : ''}`
            return (
              <li
                key={appt.id}
                className={cardClass}
                onClick={() => onAppointmentClick(appt)}
              >
                <div className="agenda-mobile-card-time">
                  <span className="time-start">{time}</span>
                  <span className="time-end">{endTime}</span>
                </div>
                <div className="agenda-mobile-card-body">
                  <div className="agenda-mobile-card-name">
                    {appt.patient?.user?.name || appt.patient?.name || 'Paciente'}
                  </div>
                  <div className="agenda-mobile-card-meta">
                    {appt.service?.name || 'Serviço'}
                    {appt.professional?.user?.name ? ` • ${appt.professional.user.name}` : ''}
                  </div>
                  <div className="agenda-mobile-card-tags">
                    <span className="agenda-mobile-tag tag-mode">
                      {appt.appointmentType === 'ONLINE' ? 'Online' : 'Presencial'}
                    </span>
                    <span className={`agenda-mobile-tag tag-status status-${appt.status.toLowerCase()}`}>
                      {STATUS_LABEL[appt.status] || appt.status}
                    </span>
                    {appt.patientConfirmation === 'CONFIRMED' && (
                      <span className="agenda-mobile-tag tag-check">✓ Confirmado</span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <span className="agenda-mobile-swipe-hint" aria-hidden="true">
        ← arraste para mudar de dia →
      </span>
    </div>
  )
}

// ─── Week Grid (visão semanal) ────────────────────────────────────────────────

interface WeekGridProps {
  selectedDate: string
  displayedProfs: any[]
  visibleAppts: Appointment[]
  stripTz: (iso: string) => string
  onCellClick: (profId: string, time: string, date: string) => void
  onAppointmentClick: (a: Appointment) => void
}

function WeekGrid({ selectedDate, displayedProfs, visibleAppts, stripTz, onCellClick, onAppointmentClick }: WeekGridProps) {
  const wStart = startOfWeek(new Date(selectedDate + 'T12:00:00'))
  const days = Array.from({ length: 7 }, (_, i) => addDays(wStart, i))

  // Pega o profissional selecionado (primeiro da lista filtrada). Se houver
  // mais de um, usa o primeiro — a vista semanal é por profissional.
  const targetProf = displayedProfs[0]
  const dayMinWidth = Math.max(720, 60 + 7 * 140)

  const apptsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    days.forEach(d => { map[fmtDate(d)] = [] })
    visibleAppts.forEach(a => {
      if (targetProf && a.professionalId !== targetProf.id) return
      const dateKey = stripTz(a.startTime).split('T')[0]
      if (map[dateKey]) map[dateKey].push(a)
    })
    return map
  }, [visibleAppts, days, targetProf, stripTz])

  if (!targetProf) {
    return (
      <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)', flex: 1 }}>
        Selecione um profissional para ver a agenda semanal.
      </div>
    )
  }

  return (
    <div
      className="calendar-grid"
      style={{
        flex: 1,
        minWidth: 0,
        '--cols': 7,
        '--calendar-min-width': `${dayMinWidth}px`,
      } as React.CSSProperties}
    >
      <div className="calendar-header">
        <div className="calendar-header-cell" style={{ width: 60 }}>Hora</div>
        {days.map((d, i) => {
          const isToday = fmtDate(d) === fmtDate(new Date())
          return (
            <div key={i} className="calendar-header-cell" style={{ background: isToday ? 'rgba(45,106,79,0.08)' : undefined, fontWeight: isToday ? 700 : undefined }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DAY_LABELS[i]}</div>
              <div style={{ fontSize: 13 }}>{d.getDate().toString().padStart(2, '0')}/{(d.getMonth() + 1).toString().padStart(2, '0')}</div>
            </div>
          )
        })}
      </div>

      <div className="calendar-body" style={{ position: 'relative' }}>
        {timeSlots.map((time, ri) => (
          <div key={ri} className="calendar-row">
            <div className="calendar-time-label">{time}</div>
            {days.map((d, ci) => (
              <div
                key={ci}
                className="calendar-cell"
                onClick={() => onCellClick(targetProf.id, time, fmtDate(d))}
              />
            ))}
          </div>
        ))}

        {days.flatMap((d, dayIndex) => {
          const dayKey = fmtDate(d)
          return (apptsByDay[dayKey] || []).map((appt, ai) => {
            const [startHour, startMin] = (stripTz(appt.startTime).split('T')[1] ?? '00:00').split(':').map(Number)
            const [endHour, endMin] = (stripTz(appt.endTime).split('T')[1] ?? '00:00').split(':').map(Number)
            const slotIndex = timeSlots.findIndex(t => {
              const [h, m] = t.split(':').map(Number)
              return h === startHour && m === startMin
            })
            if (slotIndex === -1) return null
            const durationSlots = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 30
            const cancelledByPatient = appt.status === 'CANCELLED' && appt.cancellationSource === 'PATIENT'
            const blockClass = `appointment-block ${appt.status.toLowerCase()}${cancelledByPatient ? ' cancelled-by-patient' : ''}`

            return (
              <div
                key={`${dayKey}-${ai}`}
                className={blockClass}
                style={{
                  top: slotIndex * 48 + 2,
                  height: Math.max(1, durationSlots) * 48 - 4,
                  left: `calc(60px + ${dayIndex} * ((100% - 60px) / 7) + 2px)`,
                  width: `calc((100% - 60px) / 7 - 4px)`,
                }}
                onClick={() => onAppointmentClick(appt)}
              >
                <div className="patient-name">{appt.patient?.user?.name || appt.patient?.name || 'Paciente'}</div>
                <div className="service-name">{appt.service?.name || 'Serviço'}</div>
                <div className="service-name" style={{ fontSize: 11, opacity: 0.85 }}>
                  {appt.appointmentType === 'ONLINE' ? 'Online' : 'Presencial'}
                </div>
              </div>
            )
          })
        })}
      </div>
    </div>
  )
}
