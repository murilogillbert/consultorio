import { AlertTriangle, Pill, Heart } from 'lucide-react'
import type { MedicalRecord } from '../hooks/useMedicalRecord'

// Bloco superior do prontuário: alergias (crítico), medicações em uso,
// tipo sanguíneo. Visível para todas as roles que têm acesso ao paciente
// — recepção precisa para triagem/emergência.
export default function MedicalRecordHeader({ record }: { record: MedicalRecord }) {
  const allergies = (record.allergies || '').trim()
  const meds = (record.currentMedications || '').trim()
  const blood = (record.bloodType || '').trim()
  const hasAny = allergies || meds || blood

  if (!hasAny) {
    return (
      <div style={{
        padding: 12,
        border: '1px dashed var(--color-border-default)',
        borderRadius: 8,
        fontSize: 13,
        color: 'var(--color-text-muted)',
      }}>
        Sem informações clínicas críticas registradas para este paciente.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {allergies && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid #dc2626',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 2 }}>Alergias</div>
            <div style={{ fontSize: 13 }}>{allergies}</div>
          </div>
        </div>
      )}
      {meds && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(201, 168, 76, 0.08)',
          border: '1px solid #C9A84C',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <Pill size={18} color="#C9A84C" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#C9A84C', marginBottom: 2 }}>Medicações em uso</div>
            <div style={{ fontSize: 13 }}>{meds}</div>
          </div>
        </div>
      )}
      {blood && (
        <div style={{
          padding: '8px 12px',
          background: 'var(--color-bg-secondary)',
          borderRadius: 8,
          fontSize: 13,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          width: 'fit-content',
        }}>
          <Heart size={14} color="#dc2626" /> Tipo sanguíneo: <strong>{blood}</strong>
        </div>
      )}
    </div>
  )
}
