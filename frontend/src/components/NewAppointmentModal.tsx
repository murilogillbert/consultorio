import { useMemo, useState } from 'react'
import { X, CalendarPlus, Loader2, AlertCircle, User } from 'lucide-react'
import { useProfessionals } from '../hooks/useProfessionals'
import { useServices } from '../hooks/useServices'
import { useCreateAppointment } from '../hooks/useAppointments'

interface Props {
  patientId: string
  patientName: string
  onClose: () => void
  onCreated?: () => void
}

const TIME_SLOTS = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00',
]

export default function NewAppointmentModal({ patientId, patientName, onClose, onCreated }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const { data: professionals = [], isLoading: loadingProfs } = useProfessionals()
  const { data: services = [], isLoading: loadingServices } = useServices()
  const createAppointment = useCreateAppointment()

  const [serviceId, setServiceId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('08:00')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Filter professionals to those that perform the chosen service (when one is picked)
  const filteredProfs = useMemo(() => {
    if (!serviceId) return professionals
    return professionals.filter(p => (p.serviceIds ?? []).includes(serviceId))
  }, [professionals, serviceId])

  const handleSubmit = async () => {
    setError(null)
    if (!serviceId || !professionalId) {
      setError('Selecione serviço e profissional.')
      return
    }
    try {
      await createAppointment.mutateAsync({
        patientId,
        professionalId,
        serviceId,
        startTime: `${date}T${startTime}:00`,
        endTime: `${date}T${startTime}:00`, // backend recalcula pela duração do serviço
        notes: notes.trim() || undefined,
        origin: 'RECEPTION',
      })
      onCreated?.()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Falha ao criar agendamento.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarPlus size={18} color="var(--color-accent-emerald)" /> Novo agendamento
          </h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Patient — locked to the conversation contact */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 8,
            }}
          >
            <User size={16} color="var(--color-accent-emerald)" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Paciente
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {patientName}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Serviço *</label>
              <select
                className="input-field"
                value={serviceId}
                onChange={e => { setServiceId(e.target.value); setProfessionalId('') }}
                disabled={loadingServices}
              >
                <option value="">{loadingServices ? 'Carregando...' : 'Selecione...'}</option>
                {services.filter(s => s.active).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Profissional *</label>
              <select
                className="input-field"
                value={professionalId}
                onChange={e => setProfessionalId(e.target.value)}
                disabled={loadingProfs}
              >
                <option value="">{loadingProfs ? 'Carregando...' : 'Selecione...'}</option>
                {filteredProfs.map(p => (
                  <option key={p.id} value={p.id}>{p.user?.name}</option>
                ))}
              </select>
              {serviceId && filteredProfs.length === 0 && (
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Nenhum profissional cadastrado para este serviço.
                </p>
              )}
            </div>

            <div>
              <label className="input-label">Data</label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={today}
              />
            </div>

            <div>
              <label className="input-label">Horário</label>
              <select className="input-field" value={startTime} onChange={e => setStartTime(e.target.value)}>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Observações</label>
              <textarea
                className="input-field"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-accent-danger, #dc2626)', fontSize: 13 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={createAppointment.isPending}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={createAppointment.isPending || !serviceId || !professionalId}
          >
            {createAppointment.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Criando...</>
              : <><CalendarPlus size={14} /> Criar agendamento</>}
          </button>
        </div>
      </div>
    </div>
  )
}
