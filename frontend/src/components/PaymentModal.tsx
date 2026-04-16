import { useState, useEffect, useRef } from 'react'
import { X, DollarSign, QrCode, CreditCard, Banknote, Shield, MoreHorizontal, CheckCircle, ExternalLink, Copy, Check, Loader2 } from 'lucide-react'
import { api } from '../services/api'

// ── tipos ─────────────────────────────────────────────────────────────────────

type Method = 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'INSURANCE' | 'OTHER'

interface ChargeResponse {
  paymentId: string
  status: 'PAID' | 'PENDING' | string
  method: string
  amount: number
  paidBeforeCompletion: boolean
  qrCode?: string
  qrCodeBase64?: string
  checkoutUrl?: string
  externalPaymentId?: string
}

interface Props {
  appointmentId: string
  serviceName: string
  servicePrice: number   // centavos
  appointmentStatus: string
  onClose: () => void
  onPaid: () => void
}

// ── constantes ────────────────────────────────────────────────────────────────

const METHODS: { id: Method; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  { id: 'CASH',        label: 'Dinheiro',         icon: <Banknote size={22} />,       color: '#16A34A', description: 'Pagamento em espécie' },
  { id: 'PIX',         label: 'PIX',              icon: <QrCode size={22} />,         color: '#2563EB', description: 'Gera QR Code via Mercado Pago' },
  { id: 'CREDIT_CARD', label: 'Cartão Crédito',   icon: <CreditCard size={22} />,     color: '#7C3AED', description: 'Link de pagamento seguro' },
  { id: 'DEBIT_CARD',  label: 'Cartão Débito',    icon: <CreditCard size={22} />,     color: '#0891B2', description: 'Link de pagamento seguro' },
  { id: 'INSURANCE',   label: 'Convênio Cobre',   icon: <Shield size={22} />,         color: '#D97706', description: 'Coberto pelo convênio' },
  { id: 'OTHER',       label: 'Outros',            icon: <MoreHorizontal size={22} />, color: '#6B7280', description: 'Outro método de pagamento' },
]

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── componente principal ──────────────────────────────────────────────────────

export default function PaymentModal({ appointmentId, serviceName, servicePrice, appointmentStatus, onClose, onPaid }: Props) {
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'pix' | 'card' | 'done'>('select')
  const [method, setMethod] = useState<Method | null>(null)
  const [amountStr, setAmountStr] = useState((servicePrice / 100).toFixed(2).replace('.', ','))
  const [payerEmail, setPayerEmail] = useState('')
  const [payerCpf, setPayerCpf] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ChargeResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [pollStatus, setPollStatus] = useState<'pending' | 'paid' | 'checking'>('pending')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  function startPolling(paymentId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get<{ status: string }>(`/payments/charge/${paymentId}/status`)
        if (data.status === 'PAID') {
          clearInterval(pollRef.current!)
          setPollStatus('paid')
          onPaid()
        }
      } catch { /* silently ignore */ }
    }, 4000)
  }

  async function handleCharge() {
    if (!method) return
    setError('')
    setStep('processing')

    const amountCents = Math.round(parseFloat(amountStr.replace(',', '.')) * 100)
    if (!amountCents || amountCents <= 0) {
      setError('Informe um valor válido.')
      setStep('confirm')
      return
    }

    try {
      const { data } = await api.post<ChargeResponse>('/payments/charge', {
        appointmentId,
        method,
        amount: amountCents / 100,
        payerEmail: payerEmail || undefined,
        payerCpf: payerCpf || undefined,
      })
      setResult(data)

      if (data.status === 'PAID') {
        setStep('done')
        onPaid()
      } else if (method === 'PIX') {
        setStep('pix')
        startPolling(data.paymentId)
      } else {
        setStep('card')
        startPolling(data.paymentId)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao registrar cobrança.')
      setStep('confirm')
    }
  }

  async function handleManualConfirm() {
    if (!result) return
    setPollStatus('checking')
    try {
      const { data } = await api.get<{ status: string }>(`/payments/charge/${result.paymentId}/status`)
      if (data.status === 'PAID') {
        setPollStatus('paid')
        setStep('done')
        onPaid()
      } else {
        // Force mark as paid manually
        await api.post(`/payments/${result.paymentId}/pay`)
        setPollStatus('paid')
        setStep('done')
        onPaid()
      }
    } catch {
      await api.post(`/payments/${result.paymentId}/pay`)
      setPollStatus('paid')
      setStep('done')
      onPaid()
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const selectedMeta = METHODS.find(m => m.id === method)
  const isMP = method === 'PIX' || method === 'CREDIT_CARD' || method === 'DEBIT_CARD'
  const beforeCompletion = appointmentStatus !== 'COMPLETED'

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Registrar Cobrança</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{serviceName}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">

          {/* Badge — antes/depois do atendimento */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20, fontSize: 12, marginBottom: 16,
            background: beforeCompletion ? 'rgba(37,99,235,0.08)' : 'rgba(22,163,74,0.08)',
            color: beforeCompletion ? '#2563EB' : '#16A34A',
            border: `1px solid ${beforeCompletion ? '#2563EB' : '#16A34A'}`,
          }}>
            <DollarSign size={12} />
            {beforeCompletion ? 'Cobrança antes do atendimento' : 'Cobrança após atendimento'}
          </div>

          {/* ── STEP: select method ── */}
          {step === 'select' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Selecione o método de pagamento:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMethod(m.id); setStep('confirm') }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      gap: 6, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                      border: '2px solid var(--color-border)',
                      background: 'var(--color-bg-card)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = m.color; (e.currentTarget as HTMLElement).style.background = `${m.color}08` }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-card)' }}
                  >
                    <span style={{ color: m.color }}>{m.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.3 }}>{m.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── STEP: confirm / fill details ── */}
          {step === 'confirm' && selectedMeta && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', background: `${selectedMeta.color}10`, borderRadius: 10, border: `1px solid ${selectedMeta.color}30` }}>
                <span style={{ color: selectedMeta.color }}>{selectedMeta.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedMeta.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{selectedMeta.description}</div>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Valor (R$)</label>
                <input
                  className="input-field"
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                />
              </div>

              {/* Dados do pagador só para métodos MP */}
              {isMP && (
                <>
                  <div className="input-group">
                    <label className="input-label">E-mail do paciente {method === 'PIX' && <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(opcional)</span>}</label>
                    <input className="input-field" type="email" placeholder="paciente@email.com" value={payerEmail} onChange={e => setPayerEmail(e.target.value)} />
                  </div>
                  {method === 'PIX' && (
                    <div className="input-group">
                      <label className="input-label">CPF do paciente <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(opcional)</span></label>
                      <input className="input-field" type="text" placeholder="000.000.000-00" value={payerCpf} onChange={e => setPayerCpf(e.target.value)} />
                    </div>
                  )}
                </>
              )}

              {error && (
                <p style={{ color: 'var(--color-accent-danger)', fontSize: 13, marginTop: 4 }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setStep('select'); setError('') }}>
                  Voltar
                </button>
                <button className="btn btn-primary" style={{ flex: 2, background: selectedMeta.color, borderColor: selectedMeta.color }} onClick={handleCharge}>
                  {method === 'PIX' ? 'Gerar QR Code PIX' : isMP ? 'Gerar Link de Pagamento' : 'Confirmar Pagamento'}
                </button>
              </div>
            </>
          )}

          {/* ── STEP: processing ── */}
          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-accent-primary)', margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>Processando...</p>
            </div>
          )}

          {/* ── STEP: PIX QR Code ── */}
          {step === 'pix' && result && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  Mostre o QR Code ao paciente para escanear com o app do banco:
                </p>
                {result.qrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${result.qrCodeBase64}`}
                    alt="QR Code PIX"
                    style={{ width: 200, height: 200, margin: '0 auto', display: 'block', borderRadius: 8 }}
                  />
                ) : (
                  <div style={{ width: 200, height: 200, margin: '0 auto', background: 'var(--color-bg-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode size={80} color="var(--color-text-secondary)" />
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 12, color: 'var(--color-text-primary)' }}>
                  {fmt(Math.round(result.amount * 100))}
                </div>
              </div>

              {result.qrCode && (
                <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>PIX Copia e Cola:</div>
                  <div style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--color-text-primary)', maxHeight: 48, overflow: 'hidden', fontFamily: 'monospace' }}>
                    {result.qrCode.slice(0, 80)}…
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleCopy(result.qrCode!)}
                  >
                    {copied ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar código</>}
                  </button>
                </div>
              )}

              {pollStatus === 'paid' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(22,163,74,0.08)', border: '1px solid #16A34A', borderRadius: 10, color: '#16A34A', fontWeight: 600 }}>
                  <CheckCircle size={18} /> Pagamento confirmado!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <Loader2 size={13} className="animate-spin" /> Verificando automaticamente…
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleManualConfirm} disabled={pollStatus === 'checking'}>
                    {pollStatus === 'checking' ? 'Verificando…' : 'Confirmar Pagamento'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── STEP: Card link ── */}
          {step === 'card' && result && (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <CreditCard size={40} style={{ color: selectedMeta?.color || 'var(--color-accent-primary)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  Compartilhe o link de pagamento com o paciente:
                </p>
                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 6, color: 'var(--color-text-primary)' }}>
                  {fmt(Math.round(result.amount * 100))}
                </div>
              </div>

              {result.checkoutUrl && (
                <>
                  <a
                    href={result.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, textDecoration: 'none', background: selectedMeta?.color }}
                  >
                    <ExternalLink size={16} /> Abrir Página de Pagamento
                  </a>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto 14px' }}
                    onClick={() => handleCopy(result.checkoutUrl!)}
                  >
                    {copied ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar link</>}
                  </button>
                </>
              )}

              {pollStatus === 'paid' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(22,163,74,0.08)', border: '1px solid #16A34A', borderRadius: 10, color: '#16A34A', fontWeight: 600 }}>
                  <CheckCircle size={18} /> Pagamento confirmado!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={13} className="animate-spin" /> Aguardando pagamento…
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleManualConfirm} disabled={pollStatus === 'checking'}>
                    {pollStatus === 'checking' ? 'Verificando…' : 'Confirmar Pagamento'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── STEP: done ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle size={56} color="#16A34A" style={{ margin: '0 auto 16px' }} />
              <h4 style={{ margin: '0 0 8px', color: 'var(--color-text-primary)' }}>Pagamento Registrado!</h4>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                {selectedMeta?.label} · {fmt(result ? Math.round(result.amount * 100) : servicePrice)}
              </p>
              <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>
                Fechar
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
