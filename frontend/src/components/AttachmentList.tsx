import { useRef, useState } from 'react'
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon } from 'lucide-react'
import {
  type AttachmentCategory,
  type MedicalAttachment,
  ATTACHMENT_CATEGORIES,
  attachmentAbsoluteUrl,
  useUploadMedicalAttachment,
  useDeleteMedicalAttachment,
} from '../hooks/useMedicalRecord'

interface Props {
  patientId: string
  attachments: MedicalAttachment[]
  // Quando true, mostra controles de upload e remoção.
  canManage: boolean
}

export default function AttachmentList({ patientId, attachments, canManage }: Props) {
  const upload = useUploadMedicalAttachment(patientId)
  const remove = useDeleteMedicalAttachment(patientId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<AttachmentCategory>('EXAM')

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await upload.mutateAsync({ file, category })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message || 'Falha no upload.'
      alert(msg)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      {canManage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          padding: 10, background: 'var(--color-bg-secondary)',
          borderRadius: 8, border: '1px solid var(--color-border-default)',
        }}>
          <select
            className="input-field"
            style={{ padding: '6px 8px', maxWidth: 180 }}
            value={category}
            onChange={e => setCategory(e.target.value as AttachmentCategory)}
          >
            {ATTACHMENT_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx"
            onChange={handleSelect}
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            <Upload size={14} /> {upload.isPending ? 'Enviando...' : 'Anexar arquivo'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Máx. 15 MB — PDF, imagens ou Word.
          </span>
        </div>
      )}

      {attachments.length === 0 ? (
        <div style={{
          padding: 16, textAlign: 'center', color: 'var(--color-text-muted)',
          background: 'var(--color-bg-secondary)', borderRadius: 8,
          border: '1px dashed var(--color-border-default)', fontSize: 13,
        }}>
          <Paperclip size={20} style={{ opacity: 0.4, marginBottom: 6 }} />
          <div>Nenhum anexo registrado.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map(att => (
            <div
              key={att.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)', borderRadius: 8,
              }}
            >
              {att.mimeType.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={attachmentAbsoluteUrl(att)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontWeight: 600, fontSize: 13, color: 'var(--color-accent-emerald)',
                    textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                  }}
                >
                  {att.originalName}
                </a>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {labelFor(att.category)} • {(att.size / 1024).toFixed(0)} KB •{' '}
                  {new Date(att.uploadedAt).toLocaleDateString('pt-BR')} por {att.uploadedByName}
                </div>
              </div>
              {canManage && (
                <button
                  className="btn btn-icon btn-sm"
                  title="Remover anexo"
                  onClick={() => {
                    if (confirm(`Remover anexo "${att.originalName}"?`)) remove.mutate(att.id)
                  }}
                  disabled={remove.isPending}
                >
                  <Trash2 size={14} color="var(--color-accent-danger)" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function labelFor(value: string) {
  return ATTACHMENT_CATEGORIES.find(c => c.value === value)?.label || value
}
