import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User } from 'lucide-react'
import {
  useMedicalRecord,
  useSessionNotes,
  useMedicalAttachments,
} from '../../hooks/useMedicalRecord'
import MedicalRecordHeader from '../../components/MedicalRecordHeader'
import SessionNotesTimeline from '../../components/SessionNotesTimeline'
import AttachmentList from '../../components/AttachmentList'

// Vista da recepção: ficha resumida (alergias/medicações) + linha do tempo
// de sessões SEM conteúdo clínico (backend já redige) + anexos.
export default function ProntuarioResumoPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()

  const { data: record, isLoading: lr, error } = useMedicalRecord(patientId)
  const { data: notes = [], isLoading: ln } = useSessionNotes(patientId)
  const { data: attachments = [], isLoading: la } = useMedicalAttachments(patientId)

  if (lr) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Carregando prontuário...</div>
  }
  if (error || !record) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--color-accent-danger)' }}>Não foi possível carregar o prontuário.</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Voltar</button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} title="Voltar">
          <ArrowLeft size={16} /> Voltar
        </button>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)',
          display: 'flex', alignItems: 'center', gap: 8, margin: 0,
        }}>
          <User size={20} /> Prontuário — {record.patientName}
        </h2>
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
        Visão da recepção. Conteúdo clínico das evoluções fica restrito ao profissional.
      </p>

      <section className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Ficha clínica resumida</h3>
        <MedicalRecordHeader record={record} />
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>Histórico de sessões</h3>
        {ln ? <div className="skeleton" style={{ height: 120, borderRadius: 8 }} /> : (
          <SessionNotesTimeline notes={notes} />
        )}
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>Anexos</h3>
        {la ? <div className="skeleton" style={{ height: 80, borderRadius: 8 }} /> : (
          <AttachmentList patientId={record.patientId} attachments={attachments} canManage />
        )}
      </section>
    </div>
  )
}
