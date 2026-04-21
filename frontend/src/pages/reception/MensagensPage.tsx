import { useState, useRef, useEffect } from 'react'
import {
  Send, Paperclip, Smile, CreditCard, CalendarPlus, MoreVertical,
  Hash, Lock, Loader2, MessageCircle, User, ChevronLeft, UserPlus, X, Search,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useChannels } from '../../hooks/useChannels'
import { useChannelMessages, useSendChannelMessage } from '../../hooks/useInternalMessages'
import {
  useConversations,
  usePatientConversationDetail,
  useSendConversationMessage,
  useMarkConversationRead,
} from '../../hooks/useConversations'
import { usePatients, useLinkInstagram } from '../../hooks/usePatients'

// ── Link Instagram Modal ──────────────────────────────────────────────────────
function LinkInstagramModal({
  fromPatientId,
  fromPatientName,
  onClose,
  onLinked,
}: {
  fromPatientId: string
  fromPatientName: string
  onClose: () => void
  onLinked: () => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const { data: patients = [], isLoading } = usePatients(search)
  const linkMutation = useLinkInstagram()

  const handleLink = async () => {
    if (!selected) return
    await linkMutation.mutateAsync({ targetPatientId: selected.id, fromPatientId })
    onLinked()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} color="var(--color-accent-emerald)" /> Vincular ao Instagram
          </h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            A conversa de <strong>{fromPatientName}</strong> será vinculada ao paciente selecionado.
            O histórico de mensagens será migrado automaticamente.
          </p>
          <div>
            <label className="input-label" style={{ marginBottom: 6, display: 'block' }}>
              Buscar paciente existente
            </label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="input-field"
                style={{ paddingLeft: 32 }}
                placeholder="Nome, CPF ou e-mail..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null) }}
                autoFocus
              />
            </div>
            {isLoading && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Buscando...</p>}
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {patients.filter(p => p.id !== fromPatientId).map(p => (
                <button
                  key={p.id}
                  className={`btn ${selected?.id === p.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => setSelected({ id: p.id, name: p.user?.name || '' })}
                >
                  <div className="avatar avatar-xs avatar-placeholder" style={{ flexShrink: 0 }}>
                    {(p.user?.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.user?.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{p.user?.email}</div>
                  </div>
                </button>
              ))}
              {!isLoading && search.length > 1 && patients.filter(p => p.id !== fromPatientId).length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>Nenhum paciente encontrado.</p>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleLink}
            disabled={!selected || linkMutation.isPending}
          >
            {linkMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
            Vincular
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Conversation Modal ────────────────────────────────────────────────────
function NewConversationModal({
  onClose,
  onStarted,
}: {
  onClose: () => void
  onStarted: (patientId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{ id: string; name: string; email?: string } | null>(null)
  const [text, setText] = useState('')
  const { data: patients = [], isLoading } = usePatients(search)
  const sendMessage = useSendConversationMessage()

  const handleSend = async () => {
    if (!selected || !text.trim()) return
    await sendMessage.mutateAsync({ conversationId: selected.id, content: text.trim() })
    onStarted(selected.id)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} color="var(--color-accent-emerald)" /> Nova Conversa
          </h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Patient search */}
          <div>
            <label className="input-label" style={{ marginBottom: 6, display: 'block' }}>
              Selecionar paciente
            </label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="input-field"
                style={{ paddingLeft: 32 }}
                placeholder="Buscar por nome, CPF ou e-mail..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null) }}
                autoFocus
              />
            </div>

            {/* Patient list */}
            <div style={{
              maxHeight: 220,
              overflowY: 'auto',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-secondary)',
            }}>
              {isLoading && (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <Loader2 size={16} className="animate-spin" color="var(--color-text-muted)" />
                </div>
              )}
              {!isLoading && patients.length === 0 && (
                <p style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                  {search ? 'Nenhum paciente encontrado.' : 'Digite para buscar um paciente.'}
                </p>
              )}
              {patients.map(p => {
                const name = p.user?.name || '—'
                const email = p.user?.email || ''
                const isActive = selected?.id === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelected({ id: p.id, name, email })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--color-border-subtle)',
                      background: isActive ? 'var(--color-accent-emerald-10, rgba(16,185,129,0.12))' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div className="avatar avatar-sm avatar-placeholder" style={isActive ? { background: 'var(--color-accent-emerald)', color: '#fff' } : {}}>
                      {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isActive ? 600 : 500, fontSize: 13, color: 'var(--color-text-primary)' }}>{name}</div>
                      {email && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>}
                    </div>
                    {isActive && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent-emerald)', flexShrink: 0 }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="input-label" style={{ marginBottom: 6, display: 'block' }}>
              Primeira mensagem {selected && <span style={{ color: 'var(--color-accent-emerald)', fontWeight: 500 }}>para {selected.name}</span>}
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder={selected ? `Escreva sua mensagem para ${selected.name}...` : 'Selecione um paciente acima primeiro.'}
              disabled={!selected}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend() }}
              style={{ resize: 'vertical' }}
            />
            {selected && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Ctrl+Enter para enviar</p>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!selected || !text.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
              : <><Send size={14} /> Iniciar Conversa</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MensagensPage() {
  const { user } = useAuth()
  const clinicId = user?.clinicId
  const myUserId = user?.id

  const [activeTab, setActiveTab] = useState<'patients' | 'internal'>('patients')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [patientChannelFilter, setPatientChannelFilter] = useState<'ALL' | 'APP' | 'WHATSAPP' | 'INSTAGRAM' | 'EMAIL'>('ALL')
  const [message, setMessage] = useState('')
  const [showNewConvoModal, setShowNewConvoModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Internal channels
  const { data: channels = [], isLoading: loadingChannels } = useChannels(clinicId)
  const { data: internalMessages = [], isLoading: loadingMsgs } = useChannelMessages(selectedChannelId)
  const sendInternal = useSendChannelMessage()

  // Patient conversations
  const { data: conversations = [], isLoading: loadingConvos } = useConversations(clinicId)
  const { data: convDetail, isLoading: loadingExtMsgs } = usePatientConversationDetail(selectedPatientId)
  const sendExternal = useSendConversationMessage()
  const markRead = useMarkConversationRead()
  const filteredConversations = conversations.filter((c) => {
    if (patientChannelFilter === 'ALL') return true
    return (c.source || 'APP') === patientChannelFilter
  })

  // Auto-select first channel / conversation
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) setSelectedChannelId(channels[0].id)
  }, [channels])
  useEffect(() => {
    if (conversations.length > 0 && !selectedPatientId) setSelectedPatientId(conversations[0].patientId)
  }, [conversations])
  useEffect(() => {
    if (filteredConversations.length > 0 && (!selectedPatientId || !filteredConversations.some(c => c.patientId === selectedPatientId))) {
      setSelectedPatientId(filteredConversations[0].patientId)
    }
  }, [filteredConversations, selectedPatientId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [internalMessages, convDetail?.messages])

  const handleSend = async () => {
    const text = message.trim()
    if (!text) return
    setMessage('')
    if (activeTab === 'internal' && selectedChannelId) {
      await sendInternal.mutateAsync({ channelId: selectedChannelId, content: text })
    } else if (activeTab === 'patients' && selectedPatientId) {
      await sendExternal.mutateAsync({ conversationId: selectedPatientId, content: text })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const selectedConvo = conversations.find(c => c.patientId === selectedPatientId)
  const selectedChannel = channels.find(c => c.id === selectedChannelId)
  const externalMessages = convDetail?.messages || []

  const sourceLabel: Record<string, string> = {
    APP: 'Aplicação',
    WHATSAPP: 'WhatsApp',
    INSTAGRAM: 'Instagram',
    EMAIL: 'E-mail',
  }

  return (
    <>
      <div className="messages-layout messages-layout-shell" data-mobile-view={mobileView}>
        {/* ── Left Panel ── */}
        <div className="messages-list-panel">
          <div className="messages-list-header">
            <div className="tabs">
              <button className={`tab${activeTab === 'patients' ? ' active' : ''}`} onClick={() => setActiveTab('patients')}>
                Pacientes
              </button>
              <button className={`tab${activeTab === 'internal' ? ' active' : ''}`} onClick={() => setActiveTab('internal')}>
                Chat Interno
              </button>
            </div>
          </div>

          {/* PATIENTS TAB */}
          {activeTab === 'patients' && (
            <div className="messages-list-body">
              {/* Filter + New Conversation button */}
              <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="input-field"
                  style={{ flex: 1 }}
                  value={patientChannelFilter}
                  onChange={e => setPatientChannelFilter(e.target.value as typeof patientChannelFilter)}
                >
                  <option value="ALL">Todas as origens</option>
                  <option value="APP">Aplicação</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="EMAIL">E-mail</option>
                </select>
                <button
                  className="btn btn-primary btn-sm"
                  title="Iniciar nova conversa com um paciente"
                  onClick={() => setShowNewConvoModal(true)}
                  style={{ flexShrink: 0 }}
                >
                  <UserPlus size={14} />
                </button>
              </div>

              {loadingConvos && (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <Loader2 size={20} className="animate-spin" color="var(--color-text-muted)" />
                </div>
              )}
              {!loadingConvos && filteredConversations.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <MessageCircle size={32} color="var(--color-text-muted)" style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    Nenhuma mensagem de pacientes ainda.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowNewConvoModal(true)}
                  >
                    <UserPlus size={13} /> Iniciar Conversa
                  </button>
                </div>
              )}
              {filteredConversations.map((c) => {
                const initials = c.patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                const timeLabel = c.lastMessageAt
                  ? new Date(c.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : ''
                return (
                  <div
                    key={c.patientId}
                    className={`conversation-row${selectedPatientId === c.patientId ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedPatientId(c.patientId)
                      if (c.unreadCount > 0) markRead.mutate(c.patientId)
                      setMobileView('chat')
                    }}
                  >
                    <div className="avatar avatar-sm avatar-placeholder">{initials}</div>
                    <div className="conversation-info">
                      <div className="name">
                        <User size={12} />
                        <span style={{ marginLeft: 6 }}>{c.patientName}</span>
                      </div>
                      <div className="preview">{c.lastMessage || '...'}</div>
                      <div className="preview" style={{ fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {sourceLabel[(c.source || 'APP').toUpperCase()] || (c.source || 'APP')}
                      </div>
                    </div>
                    <div className="conversation-meta">
                      <span className="time">{timeLabel}</span>
                      {c.unreadCount > 0 && <span className="badge-count">{c.unreadCount}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* INTERNAL CHAT TAB */}
          {activeTab === 'internal' && (
            <div className="messages-list-body">
              {loadingChannels && (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <Loader2 size={20} className="animate-spin" color="var(--color-text-muted)" />
                </div>
              )}
              <div className="channel-section-title">Canais</div>
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className={`channel-item${selectedChannelId === ch.id ? ' active' : ''}`}
                  onClick={() => { setSelectedChannelId(ch.id); setMobileView('chat') }}
                >
                  {ch.adminOnly ? <Lock size={12} style={{ opacity: 0.5 }} /> : <span style={{ width: 12 }} />}
                  <Hash size={14} />
                  <span style={{ flex: 1 }}>{ch.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{ch._count?.members || 0}</span>
                </div>
              ))}
              {!loadingChannels && channels.length === 0 && (
                <p style={{ padding: '8px 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Nenhum canal criado. Configure em Configurações → Chat Interno.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Chat Panel ── */}
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-header">
            <button className="msgs-back-btn btn btn-ghost btn-sm" onClick={() => setMobileView('list')}>
              <ChevronLeft size={16} /> Voltar
            </button>
            <div className="chat-header-info">
              <div className="avatar avatar-sm avatar-placeholder">
                {activeTab === 'patients'
                  ? (selectedConvo?.patientName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : '#'}
              </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {activeTab === 'patients'
                    ? (selectedConvo?.patientName || convDetail?.patient?.name || 'Selecione uma conversa')
                    : selectedChannel ? `#${selectedChannel.name}` : 'Selecione um canal'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {activeTab === 'patients'
                    ? `${selectedConvo?.patientEmail || convDetail?.patient?.email || ''}${selectedConvo?.source ? ` · ${sourceLabel[(selectedConvo.source || 'APP').toUpperCase()] || selectedConvo.source}` : ''}`
                    : selectedChannel ? `${selectedChannel._count?.members || 0} membros · ${selectedChannel.description || ''}` : ''}
                  </div>
                </div>
            </div>
            <div className="chat-header-actions">
              {activeTab === 'patients' && (
                <>
                  {selectedConvo?.source === 'INSTAGRAM' && selectedPatientId && (
                    <button
                      className="btn btn-secondary btn-sm"
                      title="Vincular a paciente existente"
                      onClick={() => setShowLinkModal(true)}
                    >
                      <User size={14} /> Vincular
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" title="Gerar Cobrança">
                    <CreditCard size={14} /> Cobrança
                  </button>
                  <button className="btn btn-primary btn-sm" title="Agendar">
                    <CalendarPlus size={14} /> Agendar
                  </button>
                </>
              )}
              <button className="btn btn-icon btn-sm">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="chat-messages">
            {(loadingMsgs || loadingExtMsgs) && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Loader2 size={20} className="animate-spin" color="var(--color-text-muted)" />
              </div>
            )}

            {/* INTERNAL MESSAGES */}
            {activeTab === 'internal' && !loadingMsgs && internalMessages.map((msg) => {
              const isMe = msg.sender?.id === myUserId
              const senderName = msg.sender?.name || 'Usuário'
              const timeLabel = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && (
                    <div style={{ fontSize: 11, color: 'var(--color-accent-emerald)', marginBottom: 2, fontWeight: 500 }}>
                      {senderName}
                    </div>
                  )}
                  <div className={`message-bubble ${isMe ? 'outgoing' : 'incoming'}`}>
                    {msg.content}
                    <div className="time">{timeLabel}</div>
                  </div>
                </div>
              )
            })}
            {activeTab === 'internal' && !loadingMsgs && internalMessages.length === 0 && selectedChannelId && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>
                Nenhuma mensagem neste canal ainda.
              </p>
            )}

            {/* PATIENT CONVERSATION MESSAGES */}
            {activeTab === 'patients' && !loadingExtMsgs && externalMessages.map((msg) => {
              const isOut = msg.direction === 'OUT'
              const timeLabel = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={msg.id} style={{ alignSelf: isOut ? 'flex-end' : 'flex-start' }}>
                  {!isOut && (
                    <div style={{ fontSize: 11, color: 'var(--color-accent-brand)', marginBottom: 2, fontWeight: 500 }}>
                      {selectedConvo?.patientName || convDetail?.patient?.name || 'Paciente'}
                    </div>
                  )}
                  <div className={`message-bubble ${isOut ? 'outgoing' : 'incoming'}`}>
                    {msg.content}
                    <div className="time">{timeLabel}</div>
                  </div>
                </div>
              )
            })}
            {activeTab === 'patients' && !loadingExtMsgs && externalMessages.length === 0 && selectedPatientId && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>
                Nenhuma mensagem nesta conversa ainda.
              </p>
            )}

            {!selectedChannelId && activeTab === 'internal' && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>
                Selecione um canal para ver as mensagens.
              </p>
            )}
            {!selectedPatientId && activeTab === 'patients' && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <MessageCircle size={40} color="var(--color-text-muted)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                  Selecione uma conversa ou inicie uma nova.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewConvoModal(true)}>
                  <UserPlus size={14} /> Nova Conversa
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="chat-input-bar">
            <button className="btn btn-icon btn-sm" style={{ color: 'var(--color-text-muted)' }}>
              <Smile size={18} />
            </button>
            <button className="btn btn-icon btn-sm" style={{ color: 'var(--color-text-muted)' }}>
              <Paperclip size={18} />
            </button>
            <input
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={(activeTab === 'internal' && !selectedChannelId) || (activeTab === 'patients' && !selectedPatientId)}
            />
            <button
              className="btn btn-primary btn-icon"
              onClick={handleSend}
              disabled={!message.trim() || sendInternal.isPending || sendExternal.isPending}
            >
              {sendInternal.isPending || sendExternal.isPending
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── New Conversation Modal ── */}
      {showNewConvoModal && (
        <NewConversationModal
          onClose={() => setShowNewConvoModal(false)}
          onStarted={(patientId) => {
            setSelectedPatientId(patientId)
            setActiveTab('patients')
            setMobileView('chat')
          }}
        />
      )}

      {/* ── Link Instagram Modal ── */}
      {showLinkModal && selectedPatientId && (
        <LinkInstagramModal
          fromPatientId={selectedPatientId}
          fromPatientName={selectedConvo?.patientName || convDetail?.patient?.name || 'este contato'}
          onClose={() => setShowLinkModal(false)}
          onLinked={() => setSelectedPatientId(null)}
        />
      )}
    </>
  )
}
