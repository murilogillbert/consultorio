import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, Save, FileText, Paperclip, Heart } from 'lucide-react'
import {
  useMedicalRecord,
  useUpdateMedicalRecord,
  useSessionNotes,
  useMedicalAttachments,
  type SessionNote,
} from '../../hooks/useMedicalRecord'
import MedicalRecordHeader from '../../components/MedicalRecordHeader'
import SessionNotesTimeline from '../../components/SessionNotesTimeline'
import AttachmentList from '../../components/AttachmentList'

type Tab = 'ficha' | 'sessoes' | 'anexos'

// Vista do profissional: ficha clínica editável + linha do tempo das suas
// evoluções com este paciente + anexos.
export default function ProntuarioPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('ficha')

  const { data: record, isLoading: lr, error } = useMedicalRecord(patientId)
  const { data: notes = [], isLoading: ln } = useSessionNotes(patientId)
  const { data: attachments = [], isLoading: la } = useMedicalAttachments(patientId)

  if (lr) return <div style={{ padding: 24, textAlign: 'center' }}>Carregando prontuário...</div>
  if (error || !record) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--color-accent-danger)' }}>Não foi possível carregar o prontuário.</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Voltar</button>
      </div>
    )
  }

  const onEditNote = (n: SessionNote) => {
    navigate(`/profissional/consulta/${n.appointmentId}/evolucao`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', paddingTop: 'var(--navbar-height)' }}>
      <div className="container" style={{ maxWidth: 980, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <User size={20} /> Prontuário — {record.patientName}
          </h1>
        </div>

        <div style={{ marginBottom: 16 }}>
          <MedicalRecordHeader record={record} />
        </div>

        <div style={{
          display: 'flex', gap: 4, marginBottom: 16,
          background: 'var(--color-bg-secondary)', borderRadius: 12, padding: 4,
          border: '1px solid var(--color-border-default)',
        }}>
          <TabButton active={tab === 'ficha'} onClick={() => setTab('ficha')} icon={<Heart size={14} />} label="Ficha clínica" />
          <TabButton active={tab === 'sessoes'} onClick={() => setTab('sessoes')} icon={<FileText size={14} />} label={`Evoluções (${notes.length})`} />
          <TabButton active={tab === 'anexos'} onClick={() => setTab('anexos')} icon={<Paperclip size={14} />} label={`Anexos (${attachments.length})`} />
        </div>

        {tab === 'ficha' && <FichaEditor patientId={record.patientId} record={record} />}
        {tab === 'sessoes' && (
          ln ? <div className="skeleton" style={{ height: 200, borderRadius: 12 }} /> :
          <SessionNotesTimeline notes={notes} canEdit onEdit={onEditNote} />
        )}
        {tab === 'anexos' && (
          la ? <div className="skeleton" style={{ height: 100, borderRadius: 12 }} /> :
          <AttachmentList patientId={record.patientId} attachments={attachments} canManage />
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: active ? 700 : 500,
        background: active ? 'var(--color-bg-primary)' : 'transparent',
        color: active ? 'var(--color-accent-emerald)' : 'var(--color-text-secondary)',
        boxShadow: active ? 'var(--shadow-card)' : 'none',
      }}
    >
      {icon} {label}
    </button>
  )
}

// ─── Ficha (editor) ─────────────────────────────────────────────────────────

function FichaEditor({ patientId, record }: { patientId: string; record: ReturnType<typeof useMedicalRecord>['data'] & {} }) {
  const update = useUpdateMedicalRecord(patientId)
  const [form, setForm] = useState({
    bloodType: record.bloodType || '',
    allergies: record.allergies || '',
    chronicConditions: record.chronicConditions || '',
    currentMedications: record.currentMedications || '',
    familyHistory: record.familyHistory || '',
    surgicalHistory: record.surgicalHistory || '',
    habits: record.habits || '',
    heightCm: record.heightCm != null ? String(record.heightCm) : '',
    weightKg: record.weightKg != null ? String(record.weightKg) : '',
  })
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await update.mutateAsync({
        bloodType: form.bloodType || null,
        allergies: form.allergies || null,
        chronicConditions: form.chronicConditions || null,
        currentMedications: form.currentMedications || null,
        familyHistory: form.familyHistory || null,
        surgicalHistory: form.surgicalHistory || null,
        habits: form.habits || null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
      })
      setSavedAt(new Date())
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao salvar.'
      alert(msg)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Input label="Tipo sanguíneo" value={form.bloodType} onChange={v => setForm(s => ({ ...s, bloodType: v }))} placeholder="A+, O-, ..." />
        <Input label="Altura (cm)" type="number" value={form.heightCm} onChange={v => setForm(s => ({ ...s, heightCm: v }))} />
        <Input label="Peso (kg)" type="number" value={form.weightKg} onChange={v => setForm(s => ({ ...s, weightKg: v }))} />
      </div>
      <Area label="Alergias" value={form.allergies} onChange={v => setForm(s => ({ ...s, allergies: v }))} hint="Visível para a recepção (triagem)." />
      <Area label="Medicações em uso" value={form.currentMedications} onChange={v => setForm(s => ({ ...s, currentMedications: v }))} hint="Visível para a recepção." />
      <Area label="Condições crônicas" value={form.chronicConditions} onChange={v => setForm(s => ({ ...s, chronicConditions: v }))} />
      <Area label="Histórico familiar" value={form.familyHistory} onChange={v => setForm(s => ({ ...s, familyHistory: v }))} />
      <Area label="Histórico cirúrgico" value={form.surgicalHistory} onChange={v => setForm(s => ({ ...s, surgicalHistory: v }))} />
      <Area label="Hábitos (tabagismo, álcool, etc.)" value={form.habits} onChange={v => setForm(s => ({ ...s, habits: v }))} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="submit" className="btn btn-primary" disabled={update.isPending}>
          <Save size={14} /> {update.isPending ? 'Salvando...' : 'Salvar ficha'}
        </button>
        {savedAt && (
          <span style={{ fontSize: 12, color: 'var(--color-accent-emerald)' }}>
            Salvo às {savedAt.toLocaleTimeString('pt-BR')}
          </span>
        )}
        {record.updatedByName && record.updatedAt && (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
            Última atualização: {new Date(record.updatedAt).toLocaleString('pt-BR')} por {record.updatedByName}
          </span>
        )}
      </div>
    </form>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <input className="input-field" type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function Area({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <textarea className="input-field" value={value} onChange={e => onChange(e.target.value)} rows={3} />
      {hint && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{hint}</span>}
    </div>
  )
}
