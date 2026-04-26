import { useEffect, useState } from 'react'
import { X, Send, Loader2, FileText, AlertCircle, Check } from 'lucide-react'
import {
  TEMPLATE_LABELS,
  useMessageTemplates,
  usePreviewTemplate,
  useSendTemplateMessage,
  type TemplateKind,
} from '../hooks/useMessageTemplates'

interface Props {
  patientId: string
  patientName: string
  onClose: () => void
  onSent?: () => void
}

export default function TemplatePickerModal({ patientId, patientName, onClose, onSent }: Props) {
  const { data: templates = [], isLoading: loadingTemplates } = useMessageTemplates()
  const previewMutation = usePreviewTemplate()
  const sendMutation = useSendTemplateMessage()

  const [selectedKind, setSelectedKind] = useState<TemplateKind | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Render preview whenever the user picks a different template.
  useEffect(() => {
    if (!selectedKind) return
    setError(null)
    setSuccess(false)
    previewMutation
      .mutateAsync({ patientId, kind: selectedKind })
      .then(r => setPreview(r.rendered))
      .catch(err => {
        setPreview('')
        setError(err?.response?.data?.message ?? 'Falha ao renderizar template.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKind, patientId])

  const handleSend = async () => {
    if (!selectedKind) return
    setError(null)
    try {
      await sendMutation.mutateAsync({ patientId, kind: selectedKind })
      setSuccess(true)
      setTimeout(() => { onSent?.(); onClose() }, 800)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Falha ao enviar mensagem.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="var(--color-accent-emerald)" /> Enviar template
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
              Para {patientName}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="input-label">Selecione o template</label>
            {loadingTemplates && (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <Loader2 size={16} className="animate-spin" color="var(--color-text-muted)" />
              </div>
            )}
            {!loadingTemplates && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                {templates.map(t => {
                  const active = selectedKind === t.kind
                  return (
                    <button
                      key={t.kind}
                      type="button"
                      className={`btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => setSelectedKind(t.kind)}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      <FileText size={13} /> {TEMPLATE_LABELS[t.kind]}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {selectedKind && (
            <div>
              <label className="input-label">
                Pré-visualização
                {previewMutation.isPending && (
                  <Loader2 size={12} className="animate-spin" style={{ marginLeft: 8, verticalAlign: 'middle' }} />
                )}
              </label>
              <div
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  whiteSpace: 'pre-wrap',
                  minHeight: 80,
                  color: 'var(--color-text-primary)',
                }}
              >
                {preview || (previewMutation.isPending ? '' : 'Renderizando...')}
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Variáveis substituídas com base no próximo agendamento do paciente (ou último agendamento se não houver futuro).
              </p>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-accent-danger, #dc2626)', fontSize: 13 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-accent-emerald, #16a34a)', fontSize: 13 }}>
              <Check size={14} /> Mensagem enviada.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={sendMutation.isPending}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!selectedKind || !preview || sendMutation.isPending}
          >
            {sendMutation.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
              : <><Send size={14} /> Enviar</>}
          </button>
        </div>
      </div>
    </div>
  )
}
