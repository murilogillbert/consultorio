import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Lock, AlertTriangle } from 'lucide-react'
import {
  useSessionNoteByAppointment,
  useCreateSessionNote,
  useUpdateSessionNote,
  useSignSessionNote,
  useMedicalRecord,
} from '../../hooks/useMedicalRecord'
import MedicalRecordHeader from '../../components/MedicalRecordHeader'

// Editor de evolução vinculada a UM appointment. Cria a SessionNote no
// primeiro salvamento; permite atualizar até ser assinada; ao assinar fica
// imutável e o appointment vai para status COMPLETED.
export default function EvolucaoEditorPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()
  const { data: note, isLoading, error } = useSessionNoteByAppointment(appointmentId)
  const { data: record } = useMedicalRecord(note?.patientId)

  // Estado controlado do formulário. Hidrata-se com a nota carregada.
  const [form, setForm] = useState({
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    diagnosis: '',
    diagnosisCode: '',
    prescription: '',
    vitalSignsJson: '',
  })

  useEffect(() => {
    if (!note) return
    setForm({
      chiefComplaint: note.chiefComplaint || '',
      subjective: note.subjective || '',
      objective: note.objective || '',
      assessment: note.assessment || '',
      plan: note.plan || '',
      diagnosis: note.diagnosis || '',
      diagnosisCode: note.diagnosisCode || '',
      prescription: note.prescription || '',
      vitalSignsJson: note.vitalSignsJson || '',
    })
  }, [note?.id])

  const isNew = !note || note.id === '00000000-0000-0000-0000-000000000000'

  const create = useCreateSessionNote(appointmentId || '')
  const update = useUpdateSessionNote(isNew ? '' : note!.id)
  const sign = useSignSessionNote(isNew ? '' : note!.id)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  if (isLoading) return <div style={{ padding: 24, textAlign: 'center' }}>Carregando consulta...</div>
  if (error || !note) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--color-accent-danger)' }}>Não foi possível carregar a consulta.</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Voltar</button>
      </div>
    )
  }

  const readOnly = note.isSigned

  const payload = () => ({
    chiefComplaint: form.chiefComplaint || null,
    subjective: form.subjective || null,
    objective: form.objective || null,
    assessment: form.assessment || null,
    plan: form.plan || null,
    diagnosis: form.diagnosis || null,
    diagnosisCode: form.diagnosisCode || null,
    prescription: form.prescription || null,
    vitalSignsJson: form.vitalSignsJson || null,
  })

  const handleSave = async () => {
    try {
      if (isNew) await create.mutateAsync(payload())
      else await update.mutateAsync(payload())
      setSavedAt(new Date())
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao salvar.'
      alert(msg)
    }
  }

  const handleSign = async () => {
    if (isNew) {
      alert('Salve a evolução antes de assinar.')
      return
    }
    if (!confirm('Ao assinar a evolução ela ficará imutável e a consulta será marcada como concluída. Continuar?')) return
    try {
      await sign.mutateAsync()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao assinar.'
      alert(msg)
    }
  }

  const apptDate = new Date(note.appointmentStartTime).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', paddingTop: 'var(--navbar-height)' }}>
      <div className="container" style={{ maxWidth: 980, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Evolução da consulta</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
              {note.serviceName} · {apptDate}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {note.isSigned ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(45,106,79,0.15)', color: 'var(--color-accent-emerald)',
                fontWeight: 700, fontSize: 12,
              }}>
                <Lock size={12} /> Assinada em {note.signedAt && new Date(note.signedAt).toLocaleString('pt-BR')}
              </span>
            ) : (
              <span style={{
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(201,168,76,0.15)', color: '#C9A84C',
                fontWeight: 700, fontSize: 12,
              }}>
                Rascunho
              </span>
            )}
          </div>
        </div>

        {record && (
          <div style={{ marginBottom: 16 }}>
            <MedicalRecordHeader record={record} />
          </div>
        )}

        {readOnly && (
          <div style={{
            padding: 10, marginBottom: 12, fontSize: 13,
            background: 'rgba(45,106,79,0.06)', border: '1px solid var(--color-accent-emerald)',
            borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Lock size={14} color="var(--color-accent-emerald)" />
            Esta evolução foi assinada e não pode mais ser editada.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Area label="Queixa principal" value={form.chiefComplaint} onChange={v => setForm(s => ({ ...s, chiefComplaint: v }))} readOnly={readOnly} />

          <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>SOAP</h3>
            <Area label="Subjetivo (S)" value={form.subjective} onChange={v => setForm(s => ({ ...s, subjective: v }))} readOnly={readOnly} />
            <Area label="Objetivo (O)" value={form.objective} onChange={v => setForm(s => ({ ...s, objective: v }))} readOnly={readOnly} />
            <Area label="Avaliação (A)" value={form.assessment} onChange={v => setForm(s => ({ ...s, assessment: v }))} readOnly={readOnly} />
            <Area label="Plano (P)" value={form.plan} onChange={v => setForm(s => ({ ...s, plan: v }))} readOnly={readOnly} />

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Area label="Diagnóstico" value={form.diagnosis} onChange={v => setForm(s => ({ ...s, diagnosis: v }))} readOnly={readOnly} rows={2} />
              <Input label="CID-10" value={form.diagnosisCode} onChange={v => setForm(s => ({ ...s, diagnosisCode: v }))} readOnly={readOnly} placeholder="F32.1, J20.9..." />
            </div>

            <Area label="Prescrição" value={form.prescription} onChange={v => setForm(s => ({ ...s, prescription: v }))} readOnly={readOnly} rows={4} />
            <Area label="Sinais vitais (livre)" value={form.vitalSignsJson} onChange={v => setForm(s => ({ ...s, vitalSignsJson: v }))} readOnly={readOnly} rows={2} hint='Ex.: "PA 120/80, FC 72, Tax 36.6°C, SpO2 98%"' />
          </fieldset>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginTop: 20,
          paddingTop: 16, borderTop: '1px solid var(--color-border-default)',
        }}>
          {!readOnly && (
            <>
              <button className="btn btn-secondary" onClick={handleSave} disabled={create.isPending || update.isPending}>
                <Save size={14} /> {create.isPending || update.isPending ? 'Salvando...' : (isNew ? 'Salvar rascunho' : 'Atualizar')}
              </button>
              <button className="btn btn-primary" onClick={handleSign} disabled={isNew || sign.isPending}>
                <Lock size={14} /> {sign.isPending ? 'Assinando...' : 'Assinar e concluir'}
              </button>
              {isNew && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={12} /> Salve primeiro para habilitar a assinatura.
                </span>
              )}
            </>
          )}
          {savedAt && (
            <span style={{ fontSize: 12, color: 'var(--color-accent-emerald)', marginLeft: 'auto' }}>
              Salvo às {savedAt.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, readOnly, placeholder }: { label: string; value: string; onChange: (v: string) => void; readOnly?: boolean; placeholder?: string }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <input className="input-field" value={value} onChange={e => onChange(e.target.value)} readOnly={readOnly} placeholder={placeholder} />
    </div>
  )
}

function Area({ label, value, onChange, readOnly, rows = 3, hint }: { label: string; value: string; onChange: (v: string) => void; readOnly?: boolean; rows?: number; hint?: string }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <textarea className="input-field" value={value} onChange={e => onChange(e.target.value)} rows={rows} readOnly={readOnly} />
      {hint && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{hint}</span>}
    </div>
  )
}
