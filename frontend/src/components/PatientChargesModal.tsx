import { useState } from 'react'
import { X, CreditCard, Loader2, CheckCircle, DollarSign, AlertCircle, Receipt } from 'lucide-react'
import { usePatientUnpaidPayments, useMarkPaymentPaid, type PaymentItem } from '../hooks/usePayments'
import PaymentModal from './PaymentModal'

interface Props {
  patientId: string
  patientName: string
  onClose: () => void
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PatientChargesModal({ patientId, patientName, onClose }: Props) {
  const { data: charges = [], isLoading, refetch } = usePatientUnpaidPayments(patientId)
  const markPaid = useMarkPaymentPaid()
  const [acting, setActing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chargeFor, setChargeFor] = useState<PaymentItem | null>(null)

  const total = charges.reduce((sum, c) => sum + c.amount, 0)

  const handleMarkPaid = async (paymentId: string) => {
    setError(null)
    setActing(paymentId)
    try {
      await markPaid.mutateAsync(paymentId)
      await refetch()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Falha ao marcar pagamento.')
    } finally {
      setActing(null)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={18} color="var(--color-accent-emerald)" /> Cobranças pendentes
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>{patientName}</p>
            </div>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isLoading && (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <Loader2 size={24} className="animate-spin" color="var(--color-text-muted)" />
              </div>
            )}

            {!isLoading && charges.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <CheckCircle size={40} color="var(--color-accent-emerald)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
                  Nenhuma cobrança pendente para este paciente.
                </p>
              </div>
            )}

            {!isLoading && charges.length > 0 && (
              <>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(234, 179, 8, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={16} color="#b45309" />
                    <span style={{ fontSize: 13, color: '#b45309', fontWeight: 500 }}>
                      Total em aberto
                    </span>
                  </div>
                  <strong style={{ fontSize: 15, color: '#b45309' }}>{formatBRL(total)}</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {charges.map((c) => {
                    const isActing = acting === c.id
                    return (
                      <div
                        key={c.id}
                        style={{
                          border: '1px solid var(--color-border-subtle)',
                          borderRadius: 8,
                          padding: 12,
                          background: 'var(--color-bg-secondary)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                              {c.serviceName ?? 'Serviço'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                              {formatDate(c.appointmentStartTime)}
                              {c.appointmentStatus && ` · ${c.appointmentStatus}`}
                            </div>
                            {c.notes && (
                              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                                {c.notes}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
                              {formatBRL(c.amount)}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: '#b45309' }}>
                              {c.status}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setChargeFor(c)}
                            disabled={isActing}
                          >
                            <CreditCard size={13} /> Gerar pagamento
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleMarkPaid(c.id)}
                            disabled={isActing}
                          >
                            {isActing
                              ? <><Loader2 size={13} className="animate-spin" /> Marcando...</>
                              : <><CheckCircle size={13} /> Marcar como pago</>}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-accent-danger, #dc2626)', fontSize: 13 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>

      {chargeFor && (
        <PaymentModal
          appointmentId={chargeFor.appointmentId}
          serviceName={chargeFor.serviceName ?? 'Serviço'}
          servicePrice={Math.round(chargeFor.amount * 100)}
          appointmentStatus={chargeFor.appointmentStatus ?? 'SCHEDULED'}
          paymentStatus={chargeFor.status}
          onClose={() => setChargeFor(null)}
          onPaid={() => { setChargeFor(null); refetch() }}
        />
      )}
    </>
  )
}
