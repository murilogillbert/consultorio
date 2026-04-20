import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Mail, MessageCircle, Camera, CreditCard, Cloud,
  ChevronDown, Eye, EyeOff, Copy, Check, Loader2,
  AlertTriangle, RefreshCw, Unplug, LogIn,
  Zap, Shield, Info
} from 'lucide-react'
import { useIntegrations, useUpdateIntegrations, useTestIntegration } from '../../hooks/useIntegrations'
import { api } from '../../services/api'

/* â”€â”€â”€ Types â”€â”€â”€ */
type ConnectionStatus = 'connected' | 'disconnected' | 'error'

interface ToastMsg {
  id: number
  text: string
  type: 'success' | 'error' | 'warning'
}
/* â”€â”€â”€ Status Badge Component â”€â”€â”€ */
function StatusBadge({ status }: { status: ConnectionStatus }) {
  const labels: Record<ConnectionStatus, string> = {
    connected: 'Conectado',
    disconnected: 'NÃ£o conectado',
    error: 'Erro de token',
  }
  return (
    <span className={`intg-status-badge intg-status-${status}`}>
      <span className="intg-status-dot" />
      {labels[status]}
    </span>
  )
}

/* â”€â”€â”€ Sensitive Field (password toggle) â”€â”€â”€ */
function SensitiveField({
  label, required, placeholder, hint, mono,
  value, onChange, error, saved,
}: {
  label: string; required?: boolean; placeholder?: string; hint?: string;
  mono?: boolean; value: string; onChange: (v: string) => void; error?: string; saved?: boolean;
}) {
  const [visible, setVisible] = useState(false)
  const hasSavedValue = saved ?? value.length > 0
  return (
    <div className="input-group">
      <label className="input-label">
        {label} {required && <span className="intg-required">*</span>}
        {hasSavedValue && !visible && (
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--color-accent-emerald, #2D6A4F)', fontWeight: 500 }}>
            âœ“ salvo
          </span>
        )}
      </label>
      <div className={`intg-sensitive-wrap${error ? ' has-error' : ''}`}>
        <input
          className={`input-field intg-sensitive-input${mono ? ' intg-mono' : ''}`}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
        />
        <button
          type="button"
          className={`intg-eye-btn${visible ? ' visible' : ''}`}
          onClick={() => setVisible(!visible)}
          title={visible ? 'Ocultar' : 'Mostrar'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className="intg-field-error">{error}</span>}
      {hint && !error && <span className="intg-field-hint">{hint}</span>}
    </div>
  )
}

/* â”€â”€â”€ Read-only Webhook URL field â”€â”€â”€ */
function WebhookField({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <div className="intg-webhook-wrap">
        <input className="input-field intg-mono intg-readonly" value={url} readOnly />
        <button
          type="button"
          className={`intg-copy-btn${copied ? ' copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
        </button>
      </div>
    </div>
  )
}

/* â”€â”€â”€ Scope Tags â”€â”€â”€ */
function ScopeTags({ scopes }: { scopes: string[] }) {
  return (
    <div className="intg-scope-tags">
      <label className="input-label" style={{ marginBottom: 8 }}>Escopos ativos</label>
      <div className="intg-tags-row">
        {scopes.map(s => (
          <span key={s} className="intg-scope-tag">{s}</span>
        ))}
      </div>
    </div>
  )
}

/* â”€â”€â”€ Instruction Box â”€â”€â”€ */
function InstructionBox({ steps }: { steps: string[] }) {
  return (
    <div className="intg-instructions">
      <div className="intg-instructions-header">
        <Info size={16} />
        <span>Como configurar</span>
      </div>
      <ol className="intg-steps">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  )
}

/* â”€â”€â”€ Save Button with loading states â”€â”€â”€ */
function SaveButton({
  label, icon, onClick, variant = 'primary',
}: {
  label: string; icon?: React.ReactNode; onClick: () => Promise<void>; variant?: 'primary' | 'secondary' | 'danger'
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const handleClick = async () => {
    setState('saving')
    try {
      await onClick()
      setState('saved')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('idle')
    }
  }
  const cls = variant === 'danger' ? 'btn btn-danger' : variant === 'secondary' ? 'btn btn-secondary' : 'btn btn-primary'
  return (
    <button className={`${cls} intg-action-btn`} onClick={handleClick} disabled={state === 'saving'}>
      {state === 'saving' ? <><Loader2 size={14} className="intg-spin" /> Salvando...</> :
       state === 'saved' ? <><Check size={14} /> Salvo!</> :
       <>{icon} {label}</>}
    </button>
  )
}

/* â”€â”€â”€ Accordion Section Wrapper â”€â”€â”€ */
function IntegrationSection({
  icon: Icon, title, description, status, children, defaultOpen,
}: {
  icon: React.ElementType; title: string; description: string;
  status: ConnectionStatus; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || false)
  const bodyRef = useRef<HTMLDivElement>(null)

  return (
    <div className={`intg-section${open ? ' open' : ''}`}>
      <button className="intg-section-header" onClick={() => setOpen(!open)}>
        <div className="intg-section-icon">
          <Icon size={22} />
        </div>
        <div className="intg-section-info">
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        <StatusBadge status={status} />
        <ChevronDown size={18} className={`intg-chevron${open ? ' rotated' : ''}`} />
      </button>
      <div className="intg-section-body-wrap" style={{ maxHeight: open ? bodyRef.current?.scrollHeight ?? 2000 : 0 }}>
        <div className="intg-section-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/*              MAIN COMPONENT                */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export default function IntegrationsPanel({ clinicId }: { clinicId?: string }) {
  const { data: existingSettings, isLoading } = useIntegrations(clinicId)
  const updateMutation = useUpdateIntegrations()
  const testMutation = useTestIntegration()

  /* Derivar status a partir dos dados reais do banco */
  const gmailStatus: ConnectionStatus = existingSettings?.gmailConnected ? 'connected' : 'disconnected'
  const waStatus: ConnectionStatus = existingSettings?.waConnected ? 'connected' : 'disconnected'
  const igStatus: ConnectionStatus = existingSettings?.igConnected
    ? 'connected'
    : existingSettings?.igAccessToken
      ? 'error'
      : 'disconnected'
  const mpStatus: ConnectionStatus = (existingSettings?.mpConnected ?? existingSettings?.connected) ? 'connected' : 'disconnected'

  /* Toast system */
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const addToast = useCallback((text: string, type: ToastMsg['type']) => {
    const id = Date.now()
    setToasts(p => [...p, { id, text, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gmailOAuth = params.get('gmail_oauth')
    if (!gmailOAuth) return

    addToast(
      params.get('gmail_message') || (gmailOAuth === 'success' ? 'Conta Google conectada com sucesso' : 'Falha ao conectar a conta Google'),
      gmailOAuth === 'success' ? 'success' : 'error',
    )

    const url = new URL(window.location.href)
    url.searchParams.delete('gmail_oauth')
    url.searchParams.delete('gmail_message')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [addToast])

  /* Helper para chamar endpoint de teste */
  const handleTest = useCallback(async (type: string) => {
    if (!clinicId) return
    try {
      const result = await testMutation.mutateAsync({ clinicId, type })
      if (!result.ok) {
        addToast(result.message || 'Falha no teste de conexao', 'error')
        return
      }
      addToast(result.message + ((result as any).detail ? ` â€” ${(result as any).detail}` : ''), 'success')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha no teste de conexÃ£o'
      addToast(msg, 'error')
    }
  }, [clinicId, testMutation, addToast])

  /* Gmail state */
  const [gmail, setGmail] = useState({ clientId: '', clientSecret: '' })
  const [gmailErrors, setGmailErrors] = useState<Record<string, string>>({})

  /* WhatsApp state */
  const [whatsapp, setWhatsapp] = useState({ phoneId: '', wabaId: '', accessToken: '', verifyToken: '', appSecret: '' })
  const [waErrors, setWaErrors] = useState<Record<string, string>>({})

  /* Instagram state */
  const [instagram, setInstagram] = useState({ accountId: '', pageId: '', pageToken: '' })
  const [igErrors, setIgErrors] = useState<Record<string, string>>({})

  /* Mercado Pago state */
  const [mp, setMp] = useState({ accessToken: '', sandboxToken: '', publicKey: '', sandboxMode: true })
  const [mpErrors, setMpErrors] = useState<Record<string, string>>({})

  /* Pub/Sub state */
  const [pubsub, setPubsub] = useState({ projectId: '', topicName: '', serviceKey: '' })
  const [psErrors, setPsErrors] = useState<Record<string, string>>({})

  /* Handle initial data load */
  useEffect(() => {
    if (existingSettings) {
      setGmail({
        clientId: existingSettings.gmailClientId || '',
        clientSecret: existingSettings.gmailClientSecret || '',
      })
      setWhatsapp({
        phoneId: existingSettings.waPhoneNumberId || '',
        wabaId: existingSettings.waWabaId || '',
        accessToken: existingSettings.waAccessToken || '',
        verifyToken: existingSettings.waVerifyToken || '',
        appSecret: existingSettings.waAppSecret || '',
      })
      setInstagram({
        accountId: existingSettings.igAccountId || '',
        pageId: existingSettings.igPageId || '',
        pageToken: existingSettings.igAccessToken || '',
      })
      setMp({
        accessToken:  existingSettings.accessTokenProdMasked    || '',
        sandboxToken: existingSettings.accessTokenSandboxMasked || '',
        publicKey:    existingSettings.publicKey               || '',
        sandboxMode:  existingSettings.sandboxMode           ?? true,
      })
      setPubsub({
        projectId: existingSettings.pubsubProjectId || '',
        topicName: existingSettings.pubsubTopicName || '',
        serviceKey: existingSettings.pubsubServiceAccount || '',
      })
    }
  }, [existingSettings])

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
  }

  /* â”€â”€â”€ Validation helpers â”€â”€â”€ */
  const validateGmail = () => {
    const e: Record<string, string> = {}
    if (!gmail.clientId) e.clientId = 'Client ID Ã© obrigatÃ³rio'
    if (!gmail.clientSecret) e.clientSecret = 'Client Secret Ã© obrigatÃ³rio'
    setGmailErrors(e)
    return Object.keys(e).length === 0
  }

  const validateWhatsApp = () => {
    const e: Record<string, string> = {}
    if (!whatsapp.phoneId) e.phoneId = 'Phone Number ID Ã© obrigatÃ³rio'
    if (!whatsapp.wabaId) e.wabaId = 'WABA ID Ã© obrigatÃ³rio'
    if (!whatsapp.accessToken) e.accessToken = 'Access Token Ã© obrigatÃ³rio'
    if (!whatsapp.verifyToken) e.verifyToken = 'Verify Token Ã© obrigatÃ³rio'
    if (!whatsapp.appSecret) e.appSecret = 'App Secret Ã© obrigatÃ³rio'
    setWaErrors(e)
    return Object.keys(e).length === 0
  }

  const validateInstagram = () => {
    const e: Record<string, string> = {}
    if (!instagram.accountId) e.accountId = 'Account ID Ã© obrigatÃ³rio'
    if (!instagram.pageId) e.pageId = 'Page ID Ã© obrigatÃ³rio'
    if (!instagram.pageToken) e.pageToken = 'Page Access Token Ã© obrigatÃ³rio'
    setIgErrors(e)
    return Object.keys(e).length === 0
  }

  const validateMercadoPago = () => {
    const e: Record<string, string> = {}
    if (mp.sandboxMode) {
      if (!mp.sandboxToken) e.sandboxToken = 'Access Token de sandbox e obrigatorio no modo de testes'
    } else if (!mp.accessToken) {
      e.accessToken = 'Access Token de producao e obrigatorio'
    }
    if (!mp.publicKey) e.publicKey = 'Public Key e obrigatoria'
    setMpErrors(e)
    return Object.keys(e).length === 0
  }

  const validatePubSub = () => {
    const e: Record<string, string> = {}
    if (!pubsub.projectId) e.projectId = 'Project ID Ã© obrigatÃ³rio'
    if (!pubsub.topicName) e.topicName = 'Nome do tÃ³pico Ã© obrigatÃ³rio'
    if (!pubsub.serviceKey) e.serviceKey = 'Service Account Key Ã© obrigatÃ³ria'
    setPsErrors(e)
    return Object.keys(e).length === 0
  }

  const baseUrl = (api.defaults.baseURL || `${window.location.origin}/api`).replace(/\/$/, '')
  const isMaskedCredential = (value: string) => {
    const trimmed = value.trim()
    return trimmed.startsWith('••') || trimmed.startsWith('â€¢â€¢')
  }
  const mercadoPagoPayload = {
    ...(mp.accessToken && !isMaskedCredential(mp.accessToken) ? { accessTokenProd: mp.accessToken } : {}),
    ...(mp.sandboxToken && !isMaskedCredential(mp.sandboxToken) ? { accessTokenSandbox: mp.sandboxToken } : {}),
    publicKey: mp.publicKey,
    sandboxMode: mp.sandboxMode,
  }

  return (
    <div className="intg-panel">
      {/* Page Title */}
      <h3 className="intg-page-title">IntegraÃ§Ãµes</h3>
      <p className="intg-page-desc">Configure as integraÃ§Ãµes externas do sistema. Cada canal requer credenciais especÃ­ficas da plataforma.</p>
      <div className="intg-info-banner" style={{ marginBottom: 20 }}>
        <AlertTriangle size={18} />
        <div>
          <strong>Estado atual das integraÃ§Ãµes</strong>
          <p>Hoje os e-mails automÃ¡ticos do sistema usam SMTP ou Ethereal no backend. Gmail, Pub/Sub e Instagram ainda estÃ£o em etapa parcial de construÃ§Ã£o.</p>
        </div>
      </div>

      {/* â•â•â•â•â•â•â• SECTION 1: GMAIL â•â•â•â•â•â•â• */}
      <IntegrationSection
        icon={Mail}
        title="Gmail OAuth"
        description="Prepara a futura integraÃ§Ã£o com caixa de entrada Gmail; o envio atual continua por SMTP"
        status={gmailStatus}
        defaultOpen
      >
        <div className="intg-info-banner">
          <AlertTriangle size={18} />
          <div>
            <strong>O que essa seÃ§Ã£o faz hoje</strong>
            <p>O callback OAuth do Google jÃ¡ estÃ¡ ativo para conexÃ£o da conta. O recebimento de e-mails por webhook/PubSub ainda continua como etapa futura.</p>
          </div>
        </div>
        <InstructionBox steps={[
          'Acesse console.cloud.google.com e crie um projeto',
          'Ative a Gmail API em "APIs e ServiÃ§os"',
          'Crie credenciais OAuth 2.0 (tipo "Aplicativo Web")',
          'Adicione a Redirect URI abaixo nas URIs autorizadas',
          'Copie o Client ID e o Client Secret para os campos abaixo',
        ]} />

        <div className="form-2col">
          <SensitiveField
            label="Client ID"
            required
            placeholder="123456789.apps.googleusercontent.com"
            hint="Encontrado em APIs e ServiÃ§os â†’ Credenciais no Google Cloud Console"
            mono
            value={gmail.clientId}
            saved={Boolean(existingSettings?.gmailClientId) && gmail.clientId === (existingSettings?.gmailClientId || '')}
            onChange={v => { setGmail(p => ({ ...p, clientId: v })); setGmailErrors(p => ({ ...p, clientId: '' })) }}
            error={gmailErrors.clientId}
          />
          <SensitiveField
            label="Client Secret"
            required
            placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
            hint="Gerado junto com o Client ID na mesma tela de credenciais"
            mono
            value={gmail.clientSecret}
            saved={Boolean(existingSettings?.gmailClientSecret) && gmail.clientSecret === (existingSettings?.gmailClientSecret || '')}
            onChange={v => { setGmail(p => ({ ...p, clientSecret: v })); setGmailErrors(p => ({ ...p, clientSecret: '' })) }}
            error={gmailErrors.clientSecret}
          />
          <WebhookField label="Redirect URI (adicionar no Google)" url={`${baseUrl}/auth/google/callback`} />
          <WebhookField label="URL do Webhook Pub/Sub" url={`${baseUrl}/webhooks/gmail`} />
        </div>

        <ScopeTags scopes={['gmail.readonly', 'gmail.send', 'gmail.modify']} />

        <div className="intg-actions">
          <SaveButton label="Testar ConexÃ£o" icon={<Zap size={14} />} variant="secondary" onClick={async () => {
            await handleTest('gmail')
          }} />
          <SaveButton label="Revogar Acesso" icon={<Unplug size={14} />} variant="danger" onClick={async () => {
            if (!clinicId) return
            await updateMutation.mutateAsync({
              clinicId,
              data: { gmailConnected: false, gmailAccessToken: '', gmailRefreshToken: '' }
            })
            addToast('Acesso ao Gmail revogado', 'warning')
          }} />
          <SaveButton label="Salvar e Autenticar" icon={<LogIn size={14} />} onClick={async () => {
            const valid = validateGmail()
            if (!clinicId) return
            await updateMutation.mutateAsync({
              clinicId,
              data: { gmailClientId: gmail.clientId, gmailClientSecret: gmail.clientSecret }
            })
            if (!valid) {
              addToast('Dados salvos â€” campos obrigatÃ³rios marcados precisam ser preenchidos para autenticar', 'warning')
              return
            }
            const response = await api.post<{ authUrl: string }>('/auth/google/start', {
              clinicId,
              returnUrl: `${window.location.origin}/admin/configuracoes?tab=integrations`,
            })
            window.location.assign(response.data.authUrl)
          }} />
        </div>
      </IntegrationSection>

      {/* â•â•â•â•â•â•â• SECTION 2: WHATSAPP â•â•â•â•â•â•â• */}
      <IntegrationSection
        icon={MessageCircle}
        title="WhatsApp Business"
        description="Envie mensagens, confirmaÃ§Ãµes e notificaÃ§Ãµes via WhatsApp"
        status={waStatus}
      >
        <InstructionBox steps={[
          'Acesse developers.facebook.com e crie um App do tipo "Business"',
          'Adicione o produto "WhatsApp" ao app',
          'Em ConfiguraÃ§Ãµes do WhatsApp, copie o Phone Number ID e o WABA ID',
          'Crie um System User com permissÃµes de WhatsApp e gere um token permanente',
          'Configure a URL do webhook abaixo no painel Meta com o Verify Token definido aqui',
        ]} />

        <div className="form-2col">
          <SensitiveField
            label="Phone Number ID"
            required
            placeholder="1234567890123456"
            hint="Encontrado em WhatsApp â†’ ConfiguraÃ§Ã£o da API â†’ NÃºmero de telefone"
            mono
            value={whatsapp.phoneId}
            onChange={v => { setWhatsapp(p => ({ ...p, phoneId: v })); setWaErrors(p => ({ ...p, phoneId: '' })) }}
            error={waErrors.phoneId}
          />
          <SensitiveField
            label="WABA ID (WhatsApp Business Account)"
            required
            placeholder="9876543210123456"
            hint="Encontrado em ConfiguraÃ§Ãµes da Conta Business no Meta Business Suite"
            mono
            value={whatsapp.wabaId}
            onChange={v => { setWhatsapp(p => ({ ...p, wabaId: v })); setWaErrors(p => ({ ...p, wabaId: '' })) }}
            error={waErrors.wabaId}
          />
          <div className="input-group full-span">
            <SensitiveField
              label="System User Access Token"
              required
              placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="âš ï¸ Use um token de System User (permanente). Tokens de usuÃ¡rio comum expiram em 60 dias."
              mono
              value={whatsapp.accessToken}
              onChange={v => { setWhatsapp(p => ({ ...p, accessToken: v })); setWaErrors(p => ({ ...p, accessToken: '' })) }}
              error={waErrors.accessToken}
            />
          </div>
          <SensitiveField
            label="Verify Token"
            required
            placeholder="meu_token_seguro_123"
            hint="Defina uma string qualquer â€” deve ser idÃªntica ao valor no painel Meta"
            value={whatsapp.verifyToken}
            onChange={v => { setWhatsapp(p => ({ ...p, verifyToken: v })); setWaErrors(p => ({ ...p, verifyToken: '' })) }}
            error={waErrors.verifyToken}
          />
          <SensitiveField
            label="App Secret"
            required
            placeholder="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
            hint="Usado para validar assinatura HMAC-SHA256 dos webhooks. Encontrado em ConfiguraÃ§Ãµes â†’ BÃ¡sico."
            mono
            value={whatsapp.appSecret}
            onChange={v => { setWhatsapp(p => ({ ...p, appSecret: v })); setWaErrors(p => ({ ...p, appSecret: '' })) }}
            error={waErrors.appSecret}
          />
          <WebhookField label="URL do Webhook" url={`${baseUrl}/webhooks/whatsapp`} />
        </div>

        <div className="intg-actions">
          <SaveButton label="Testar ConexÃ£o" icon={<Zap size={14} />} variant="secondary" onClick={async () => {
            await handleTest('whatsapp')
          }} />
          <SaveButton label="Desconectar" icon={<Unplug size={14} />} variant="danger" onClick={async () => {
            if (!clinicId) return
            await updateMutation.mutateAsync({ clinicId, data: { waConnected: false } })
            addToast('WhatsApp desconectado', 'warning')
          }} />
          <SaveButton label="Salvar AlteraÃ§Ãµes" icon={<Shield size={14} />} onClick={async () => {
            const valid = validateWhatsApp()
            if (!clinicId) return
            await updateMutation.mutateAsync({
              clinicId,
              data: {
                waPhoneNumberId: whatsapp.phoneId,
                waWabaId: whatsapp.wabaId,
                waAccessToken: whatsapp.accessToken,
                waVerifyToken: whatsapp.verifyToken,
                waAppSecret: whatsapp.appSecret
              }
            })
            addToast(
              valid
                ? 'ConfiguraÃ§Ãµes do WhatsApp salvas com sucesso'
                : 'Dados salvos â€” campos obrigatÃ³rios destacados em vermelho ainda precisam ser preenchidos',
              valid ? 'success' : 'warning'
            )
          }} />
        </div>
      </IntegrationSection>

      {/* â•â•â•â•â•â•â• SECTION 3: INSTAGRAM DIRECT â•â•â•â•â•â•â• */}
      <IntegrationSection
        icon={Camera}
        title="Instagram Direct"
        description="Receba e responda DMs do Instagram diretamente na plataforma"
        status={igStatus}
      >
        <InstructionBox steps={[
          'Certifique-se de ter uma Conta Instagram Business vinculada a uma PÃ¡gina do Facebook',
          'No Meta Developer Portal, adicione o produto "Messenger" ao seu app',
          'Em Graph API Explorer, gere um Page Access Token de longa duraÃ§Ã£o',
          'Configure a URL do webhook abaixo para o Instagram no painel do app',
          'Selecione os campos de inscriÃ§Ã£o desejados (listados abaixo)',
        ]} />

        <div className="form-2col">
          <SensitiveField
            label="Instagram Business Account ID"
            required
            placeholder="17841400000000000"
            hint="Encontrado via Graph API: GET /me/accounts â†’ instagram_business_account"
            mono
            value={instagram.accountId}
            onChange={v => { setInstagram(p => ({ ...p, accountId: v })); setIgErrors(p => ({ ...p, accountId: '' })) }}
            error={igErrors.accountId}
          />
          <SensitiveField
            label="Facebook Page ID"
            required
            placeholder="100000000000000"
            hint="Deve ser a PÃ¡gina do Facebook vinculada Ã  conta Instagram Business"
            mono
            value={instagram.pageId}
            onChange={v => { setInstagram(p => ({ ...p, pageId: v })); setIgErrors(p => ({ ...p, pageId: '' })) }}
            error={igErrors.pageId}
          />
          <div className="input-group full-span">
            <SensitiveField
              label="Page Access Token (longa duraÃ§Ã£o)"
              required
              placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="âš ï¸ Tokens de curta duraÃ§Ã£o expiram em 1 hora. Use o Graph API para trocar por um de longa duraÃ§Ã£o (60 dias) e depois por um permanente."
              mono
              value={instagram.pageToken}
              onChange={v => { setInstagram(p => ({ ...p, pageToken: v })); setIgErrors(p => ({ ...p, pageToken: '' })) }}
              error={igErrors.pageToken}
            />
          </div>
          <WebhookField label="URL do Webhook" url={`${baseUrl}/webhooks/instagram`} />
        </div>

        <div className="intg-scope-tags">
          <label className="input-label" style={{ marginBottom: 8 }}>Campos subscritos do webhook</label>
          <div className="intg-tags-row">
            {['messages', 'messaging_postbacks', 'story_mentions', 'message_reactions'].map(s => (
              <span key={s} className="intg-scope-tag">{s}</span>
            ))}
          </div>
        </div>

        <div className="intg-actions">
          <SaveButton label="Testar ConexÃ£o" icon={<Zap size={14} />} variant="secondary" onClick={async () => {
            await handleTest('instagram')
          }} />
          <SaveButton label="Revogar Acesso" icon={<Unplug size={14} />} variant="danger" onClick={async () => {
            if (!clinicId) return
            await updateMutation.mutateAsync({ clinicId, data: { igConnected: false, igAccessToken: '' } })
            addToast('Acesso ao Instagram revogado', 'warning')
          }} />
          <SaveButton label="Reconectar" icon={<RefreshCw size={14} />} onClick={async () => {
            const valid = validateInstagram()
            if (!clinicId) return
            await updateMutation.mutateAsync({
              clinicId,
              data: {
                igAccountId: instagram.accountId,
                igPageId: instagram.pageId,
                igAccessToken: instagram.pageToken
              }
            })
            addToast(
              valid
                ? 'Instagram reconectado com sucesso'
                : 'Dados salvos â€” campos obrigatÃ³rios destacados em vermelho ainda precisam ser preenchidos',
              valid ? 'success' : 'warning'
            )
          }} />
        </div>
      </IntegrationSection>

      {/* â•â•â•â•â•â•â• SECTION 4: MERCADO PAGO â•â•â•â•â•â•â• */}
      <IntegrationSection
        icon={CreditCard}
        title="Mercado Pago"
        description="Processe pagamentos online com Pix, cartÃ£o e boleto"
        status={mpStatus}
      >
        <InstructionBox steps={[
          'Acesse mercadopago.com.br/developers e faÃ§a login',
          'Crie uma aplicaÃ§Ã£o ou acesse a existente',
          'Em Credenciais de ProduÃ§Ã£o, copie o Access Token e a Public Key',
          'Em Credenciais de Teste, copie o Access Token de sandbox',
          'Salve as credenciais e teste a conexao no modo desejado',
          'A confirmacao dos pagamentos passa a ser feita por consulta direta na API do Mercado Pago',
        ]} />

        {/* â”€â”€ Modo sandbox / produÃ§Ã£o â”€â”€ */}
        <div className="intg-mp-mode-toggle">
          <span className="intg-mp-mode-label">Modo ativo:</span>
          <button
            type="button"
            className={`intg-mode-btn${mp.sandboxMode ? ' active' : ''}`}
            onClick={() => setMp(p => ({ ...p, sandboxMode: true }))}
          >
            ðŸ§ª Sandbox / Testes
          </button>
          <button
            type="button"
            className={`intg-mode-btn${!mp.sandboxMode ? ' active' : ''}`}
            onClick={() => setMp(p => ({ ...p, sandboxMode: false }))}
          >
            ðŸš€ ProduÃ§Ã£o
          </button>
          <span className="intg-mp-mode-hint">
            {mp.sandboxMode
              ? 'CobranÃ§as NÃƒO sÃ£o reais. Use para testes.'
              : 'âš ï¸ CobranÃ§as REAIS serÃ£o processadas.'}
          </span>
        </div>

        <div className="form-2col">
          <div className="input-group full-span">
            <SensitiveField
              label={`Access Token (${mp.sandboxMode ? 'Sandbox/Testes' : 'ProduÃ§Ã£o'})`}
              required
              placeholder={mp.sandboxMode
                ? 'TEST-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxx-000000000'
                : 'APP_USR-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxx-000000000'}
              hint={mp.sandboxMode
                ? 'Credencial de teste. Encontrado em Credenciais de Teste no painel do MP.'
                : 'âš ï¸ Credencial de produÃ§Ã£o â€” nunca exponha publicamente.'}
              mono
              value={mp.sandboxMode ? mp.sandboxToken : mp.accessToken}
              onChange={v => mp.sandboxMode
                ? (setMp(p => ({ ...p, sandboxToken: v })), setMpErrors(p => ({ ...p, sandboxToken: '' })))
                : (setMp(p => ({ ...p, accessToken: v })), setMpErrors(p => ({ ...p, accessToken: '' })))
              }
              error={mp.sandboxMode ? mpErrors.sandboxToken : mpErrors.accessToken}
            />
          </div>
          {!mp.sandboxMode && (
            <div className="input-group full-span">
              <SensitiveField
                label="Access Token (Sandbox) â€” guarda para alternÃ¢ncia rÃ¡pida"
                placeholder="TEST-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxx-000000000"
                hint="Opcional. Permite alternar entre prod e sandbox sem redigitar."
                mono
                value={mp.sandboxToken}
                onChange={v => setMp(p => ({ ...p, sandboxToken: v }))}
              />
            </div>
          )}
          <SensitiveField
            label="Public Key"
            required
            placeholder={mp.sandboxMode
              ? 'TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
              : 'APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
            hint="Encontrado junto ao Access Token no painel do Mercado Pago."
            mono
            value={mp.publicKey}
            onChange={v => { setMp(p => ({ ...p, publicKey: v })); setMpErrors(p => ({ ...p, publicKey: '' })) }}
            error={mpErrors.publicKey}
          />
        </div>

        <div className="intg-actions">
          <SaveButton label="Testar ConexÃ£o" icon={<Zap size={14} />} variant="secondary" onClick={async () => {
            const valid = validateMercadoPago()
            if (!clinicId) return
            if (!valid) {
              addToast('Preencha Access Token e Public Key antes de testar', 'warning')
              return
            }
            await updateMutation.mutateAsync({
              clinicId,
              data: mercadoPagoPayload as any
            })
            await handleTest('mercadopago')
          }} />
          <SaveButton label="Desconectar" icon={<Unplug size={14} />} variant="danger" onClick={async () => {
            if (!clinicId) return
            await updateMutation.mutateAsync({ clinicId, data: { connected: false } as any })
            addToast('Mercado Pago desconectado', 'warning')
          }} />
          <SaveButton label="Salvar AlteraÃ§Ãµes" icon={<Shield size={14} />} onClick={async () => {
            const valid = validateMercadoPago()
            if (!clinicId) return
            await updateMutation.mutateAsync({
              clinicId,
              data: mercadoPagoPayload as any
            })
            addToast(
              valid
                ? `ConfiguraÃ§Ãµes do Mercado Pago salvas Â· Modo: ${mp.sandboxMode ? 'Sandbox' : 'ProduÃ§Ã£o'}`
                : 'Dados salvos â€” campos obrigatÃ³rios ainda precisam ser preenchidos',
              valid ? 'success' : 'warning'
            )
          }} />
        </div>
      </IntegrationSection>

      {/* â•â•â•â•â•â•â• SECTION 5: GOOGLE PUB/SUB â•â•â•â•â•â•â• */}
      <IntegrationSection
        icon={Cloud}
        title="Google Pub/Sub"
        description="NotificaÃ§Ãµes em tempo real do Gmail via Google Cloud Pub/Sub"
        status="disconnected"
      >

        <InstructionBox steps={[
          'No Google Cloud Console, acesse o mesmo projeto da Gmail API',
          'Ative a API do Cloud Pub/Sub',
          'Crie um tÃ³pico (ex: gmail-notifications)',
          'Crie uma service account com as permissÃµes pubsub.subscriber e gmail.readonly',
          'Exporte o JSON da service account e cole no campo abaixo',
        ]} />

        <div className="form-2col">
          <div className="input-group">
            <label className="input-label">
              Google Cloud Project ID <span className="intg-required">*</span>
            </label>
            <input
              className={`input-field${psErrors.projectId ? ' intg-error-border' : ''}`}
              placeholder="meu-projeto-clinica-123"
              value={pubsub.projectId}
              onChange={e => { setPubsub(p => ({ ...p, projectId: e.target.value })); setPsErrors(p => ({ ...p, projectId: '' })) }}
            />
            {psErrors.projectId && <span className="intg-field-error">{psErrors.projectId}</span>}
            <span className="intg-field-hint">ID do projeto no Google Cloud Console (nÃ£o Ã© o nome)</span>
          </div>
          <div className="input-group">
            <label className="input-label">
              Nome do TÃ³pico Pub/Sub <span className="intg-required">*</span>
            </label>
            <input
              className={`input-field${psErrors.topicName ? ' intg-error-border' : ''}`}
              placeholder="gmail-notifications"
              value={pubsub.topicName}
              onChange={e => { setPubsub(p => ({ ...p, topicName: e.target.value })); setPsErrors(p => ({ ...p, topicName: '' })) }}
            />
            {psErrors.topicName && <span className="intg-field-error">{psErrors.topicName}</span>}
            <span className="intg-field-hint">
              Formato final: projects/{pubsub.projectId || '{project-id}'}/topics/{pubsub.topicName || '{topic-name}'}
            </span>
          </div>
          <div className="input-group full-span">
            <label className="input-label">
              Service Account Key (JSON) <span className="intg-required">*</span>
            </label>
            <textarea
              className={`input-field intg-mono intg-json-textarea${psErrors.serviceKey ? ' intg-error-border' : ''}`}
              placeholder={`{
  "type": "service_account",
  "project_id": "meu-projeto",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "clinic@meu-projeto.iam.gserviceaccount.com",
  "client_id": "0000000000000000  "client_id": "0000000000000000"
}`}
              rows={12}
              value={pubsub.serviceKey}
              onChange={e => { setPubsub(p => ({ ...p, serviceKey: e.target.value })); setPsErrors(p => ({ ...p, serviceKey: '' })) }}
            />
            {psErrors.serviceKey && <span className="intg-field-error">{psErrors.serviceKey}</span>}
            <span className="intg-field-hint">Cole o conteÃºdo completo do arquivo JSON exportado pelo Google Cloud</span>
          </div>
        </div>

        <div className="intg-actions">
          <SaveButton label="Salvar ConfiguraÃ§Ãµes" icon={<Shield size={14} />} onClick={async () => {
            const valid = validatePubSub()
            if (!clinicId) return
            await updateMutation.mutateAsync({
              clinicId,
              data: {
                pubsubProjectId: pubsub.projectId,
                pubsubTopicName: pubsub.topicName,
                pubsubServiceAccount: pubsub.serviceKey,
              }
            })
            addToast(
              valid
                ? 'ConfiguraÃ§Ãµes do Pub/Sub salvas'
                : 'Dados salvos â€” campos obrigatÃ³rios destacados em vermelho ainda precisam ser preenchidos',
              valid ? 'success' : 'warning'
            )
          }} />
        </div>
      </IntegrationSection>

      {/* Toast Container */}
      <div className="intg-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`intg-toast intg-toast-${t.type}`}>
            {t.type === 'error' && <AlertTriangle size={16} />}
            {t.type === 'success' && <Check size={16} />}
            {t.type === 'warning' && <AlertTriangle size={16} />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
