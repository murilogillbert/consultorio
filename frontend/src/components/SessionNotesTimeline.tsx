import { Calendar, Lock, User, FileText, Edit3 } from 'lucide-react'
import type { SessionNote } from '../hooks/useMedicalRecord'

interface Props {
  notes: SessionNote[]
  // Quando true, mostra botão "Editar" para o profissional autor.
  canEdit?: boolean
  onEdit?: (note: SessionNote) => void
  emptyMessage?: string
}

// Linha do tempo de evoluções. Quando `isRestrictedView=true` (recepção),
// os campos clínicos vêm null do backend; renderizamos apenas a tarja
// "Conteúdo clínico restrito".
export default function SessionNotesTimeline({ notes, canEdit, onEdit, emptyMessage }: Props) {
  if (notes.length === 0) {
    return (
      <div style={{
        padding: 24,
        textAlign: 'center',
        background: 'var(--color-bg-secondary)',
        borderRadius: 12,
        border: '1px dashed var(--color-border-default)',
        color: 'var(--color-text-muted)',
      }}>
        <FileText size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
        <div>{emptyMessage || 'Nenhuma evolução registrada para este paciente.'}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {notes.map(note => (
        <SessionNoteCard
          key={note.id}
          note={note}
          canEdit={canEdit}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}

function SessionNoteCard({ note, canEdit, onEdit }: { note: SessionNote; canEdit?: boolean; onEdit?: (n: SessionNote) => void }) {
  const date = new Date(note.appointmentStartTime).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{
      padding: 14,
      background: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 12,
      borderLeft: note.isSigned ? '4px solid var(--color-accent-emerald)' : '4px solid #C9A84C',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <Calendar size={14} /> {date}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <User size={12} /> {note.professionalName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {note.serviceName}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {note.isSigned ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 999,
              background: 'rgba(45,106,79,0.12)', color: 'var(--color-accent-emerald)',
              fontSize: 11, fontWeight: 600,
            }}>
              <Lock size={11} /> Assinada
            </span>
          ) : (
            <span style={{
              padding: '3px 8px', borderRadius: 999,
              background: 'rgba(201,168,76,0.12)', color: '#C9A84C',
              fontSize: 11, fontWeight: 600,
            }}>
              Rascunho
            </span>
          )}
          {canEdit && !note.isSigned && onEdit && (
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(note)} title="Editar">
              <Edit3 size={14} /> Editar
            </button>
          )}
        </div>
      </div>

      {note.isRestrictedView ? (
        <div style={{
          padding: 10,
          background: 'rgba(0,0,0,0.04)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--color-text-muted)',
          fontStyle: 'italic',
        }}>
          Conteúdo clínico restrito ao profissional responsável.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
          {note.chiefComplaint && <Field label="Queixa principal" value={note.chiefComplaint} />}
          {note.subjective && <Field label="Subjetivo" value={note.subjective} />}
          {note.objective && <Field label="Objetivo" value={note.objective} />}
          {note.assessment && <Field label="Avaliação" value={note.assessment} />}
          {note.plan && <Field label="Plano / Conduta" value={note.plan} />}
          {note.diagnosis && <Field label={`Diagnóstico${note.diagnosisCode ? ` (${note.diagnosisCode})` : ''}`} value={note.diagnosis} />}
          {note.prescription && <Field label="Prescrição" value={note.prescription} />}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  )
}
