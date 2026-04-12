import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, CreditCard, CalendarPlus, MoreVertical, Hash, Lock, MessageSquare, Mail, Loader2, MessageCircle, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useChannels } from '../../hooks/useChannels'
import { useChannelMessages, useSendChannelMessage } from '../../hooks/useInternalMessages'
import {
  useConversations,
  usePatientConversationDetail,
  useSendConversationMessage,
  useMarkConversationRead,
} from '../../hooks/useConversations'

export default function MensagensPage() {
  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId
  const myUserId = (user as any)?.id

  const [activeTab, setActiveTab] = useState<'patients' | 'internal'>('patients')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
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

  // Auto-select first channel / conversation
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) setSelectedChannelId(channels[0].id)
  }, [channels])
  useEffect(() => {
    if (conversations.length > 0 && !selectedPatientId) setSelectedPatientId(conversations[0].patientId)
  }, [conversations])

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

  return (
    <div className="messages-layout" style={{ margin: 'calc(var(--space-8) * -1)', height: 'calc(100vh - var(--topbar-height))' }}>
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
            {loadingConvos && (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <Loader2 size={20} className="animate-spin" color="var(--color-text-muted)" />
              </div>
            )}
            {!loadingConvos && conversations.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <MessageCircle size={32} color="var(--color-text-muted)" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhuma mensagem de pacientes ainda.</p>
              </div>
            )}
            {conversations.map((c) => {
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
                  }}
                >
                  <div className="avatar avatar-sm avatar-placeholder">{initials}</div>
                  <div className="conversation-info">
                    <div className="name">
                      <User size={12} />
                      <span style={{ marginLeft: 6 }}>{c.patientName}</span>
                    </div>
                    <div className="preview">{c.lastMessage || '...'}</div>
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
                onClick={() => setSelectedChannelId(ch.id)}
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
          <div className="chat-header-info">
            <div className="avatar avatar-sm avatar-placeholder">
              {activeTab === 'patients'
                ? (selectedConvo?.patientName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                : '#'}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>
                {activeTab === 'patients'
                  ? (selectedConvo?.patientName || 'Selecione uma conversa')
                  : selectedChannel ? `#${selectedChannel.name}` : 'Selecione um canal'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {activeTab === 'patients'
                  ? selectedConvo?.patientEmail || ''
                  : selectedChannel ? `${selectedChannel._count?.members || 0} membros · ${selectedChannel.description || ''}` : ''}
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            {activeTab === 'patients' && (
              <>
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
              <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
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
              <div key={msg.id} style={{ alignSelf: isOut ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                {!isOut && (
                  <div style={{ fontSize: 11, color: 'var(--color-accent-brand)', marginBottom: 2, fontWeight: 500 }}>
                    {selectedConvo?.patientName || 'Paciente'}
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
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>
              Selecione uma conversa para ver as mensagens.
            </p>
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
  )
}
