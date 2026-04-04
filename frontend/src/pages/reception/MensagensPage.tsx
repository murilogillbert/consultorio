import { useState, useRef, useEffect } from 'react'
import { Search, Send, Paperclip, Smile, CreditCard, CalendarPlus, MoreVertical, Hash, Lock, Users, MessageSquare, Star, Phone, Mail, MessageCircle as WhatsAppIcon, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useChannels } from '../../hooks/useChannels'
import { useChannelMessages, useSendChannelMessage } from '../../hooks/useInternalMessages'
import { useConversations, useConversationMessages, useSendConversationMessage, useMarkConversationRead } from '../../hooks/useConversations'

const channelIcon = (ch: string) => {
  if (ch === 'whatsapp' || ch === 'WHATSAPP') return <WhatsAppIcon size={14} color="var(--color-accent-emerald)" />
  if (ch === 'email' || ch === 'EMAIL') return <Mail size={14} color="var(--color-accent-gold)" />
  return <MessageSquare size={14} color="var(--color-text-muted)" />
}

export default function MensagensPage() {
  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId
  const myUserId = (user as any)?.id

  const [activeTab, setActiveTab] = useState<'patients' | 'internal'>('patients')
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email' | 'chat'>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Internal channels (from API)
  const { data: channels = [], isLoading: loadingChannels } = useChannels(clinicId)

  // Internal messages for selected channel
  const { data: internalMessages = [], isLoading: loadingMsgs } = useChannelMessages(selectedChannelId)
  const sendInternal = useSendChannelMessage()

  // Patient conversations (from API)
  const { data: conversations = [], isLoading: loadingConvos } = useConversations(clinicId)
  const { data: externalMessages = [], isLoading: loadingExtMsgs } = useConversationMessages(selectedConvoId)
  const sendExternal = useSendConversationMessage()
  const markRead = useMarkConversationRead()

  // Auto-select first channel / conversation
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) setSelectedChannelId(channels[0].id)
  }, [channels])
  useEffect(() => {
    if (conversations.length > 0 && !selectedConvoId) setSelectedConvoId(conversations[0].id)
  }, [conversations])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [internalMessages, externalMessages])

  const handleSend = async () => {
    const text = message.trim()
    if (!text) return
    setMessage('')
    if (activeTab === 'internal' && selectedChannelId) {
      await sendInternal.mutateAsync({ channelId: selectedChannelId, content: text })
    } else if (activeTab === 'patients' && selectedConvoId) {
      await sendExternal.mutateAsync({ conversationId: selectedConvoId, content: text })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const filteredConvos = conversations.filter(c => {
    if (channelFilter === 'all') return true
    return c.channel.toLowerCase() === channelFilter
  })

  const selectedConvo = conversations.find(c => c.id === selectedConvoId)
  const selectedChannel = channels.find(c => c.id === selectedChannelId)

  return (
    <div className="messages-layout" style={{ margin: 'calc(var(--space-8) * -1)', height: 'calc(100vh - var(--topbar-height))' }}>
      {/* Left Panel */}
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
          <>
            <div style={{ padding: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
              {(['all', 'whatsapp', 'email', 'chat'] as const).map(ch => (
                <button
                  key={ch}
                  className={`btn btn-icon btn-sm${channelFilter === ch ? ' btn-primary' : ''}`}
                  style={{ border: '1px solid var(--color-border-default)' }}
                  title={ch}
                  onClick={() => setChannelFilter(ch)}
                >
                  {ch === 'all' ? <MessageSquare size={14} /> : ch === 'whatsapp' ? <WhatsAppIcon size={14} /> : ch === 'email' ? <Mail size={14} /> : <Phone size={14} />}
                </button>
              ))}
            </div>

            <div className="messages-list-body">
              {loadingConvos && (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <Loader2 size={20} className="animate-spin" color="var(--color-text-muted)" />
                </div>
              )}
              {!loadingConvos && filteredConvos.length === 0 && (
                <p style={{ padding: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhuma conversa.</p>
              )}
              {filteredConvos.map((c) => {
                const name = c.contact?.name || c.contact?.phone || c.contact?.email || 'Contato'
                const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
                const lastMsg = c.messages?.[0]
                const preview = lastMsg?.content || '...'
                const timeLabel = c.lastMessageAt
                  ? new Date(c.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : ''
                return (
                  <div
                    key={c.id}
                    className={`conversation-row${selectedConvoId === c.id ? ' active' : ''}`}
                    onClick={() => { setSelectedConvoId(c.id); if (c.unreadCount > 0) markRead.mutate(c.id) }}
                  >
                    <div className="avatar avatar-sm avatar-placeholder">{initials}</div>
                    <div className="conversation-info">
                      <div className="name">
                        {channelIcon(c.channel)}
                        <span style={{ marginLeft: 6 }}>{name}</span>
                      </div>
                      <div className="preview">{preview}</div>
                    </div>
                    <div className="conversation-meta">
                      <span className="time">{timeLabel}</span>
                      {c.unreadCount > 0 && <span className="badge-count">{c.unreadCount}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
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
              <p style={{ padding: '8px 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhum canal criado. Configure em Configurações → Chat Interno.</p>
            )}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="chat-panel">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="avatar avatar-sm avatar-placeholder">
              {activeTab === 'patients'
                ? (selectedConvo?.contact?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)
                : '#'}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>
                {activeTab === 'patients'
                  ? (selectedConvo?.contact?.name || selectedConvo?.contact?.phone || 'Conversa')
                  : selectedChannel ? `#${selectedChannel.name}` : 'Selecione um canal'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {activeTab === 'patients'
                  ? selectedConvo ? channelIcon(selectedConvo.channel) : null
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
            const isMe = msg.senderId === myUserId
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
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>Nenhuma mensagem neste canal ainda.</p>
          )}

          {/* PATIENT CONVERSATION MESSAGES */}
          {activeTab === 'patients' && !loadingExtMsgs && externalMessages.map((msg) => {
            const isOut = msg.direction === 'OUT'
            const timeLabel = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={msg.id} style={{ alignSelf: isOut ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                <div className={`message-bubble ${isOut ? 'outgoing' : 'incoming'}`}>
                  {msg.content}
                  <div className="time">{timeLabel}</div>
                </div>
              </div>
            )
          })}
          {activeTab === 'patients' && !loadingExtMsgs && externalMessages.length === 0 && selectedConvoId && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>Nenhuma mensagem nesta conversa ainda.</p>
          )}

          {!selectedChannelId && activeTab === 'internal' && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>Selecione um canal para ver as mensagens.</p>
          )}
          {!selectedConvoId && activeTab === 'patients' && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>Selecione uma conversa para ver as mensagens.</p>
          )}

          <div ref={messagesEndRef} />
        </div>

        {activeTab === 'patients' && (
          <div className="chat-action-bar">
            <button className="btn btn-ghost btn-sm">
              <Star size={14} /> Templates
            </button>
            <button className="btn btn-ghost btn-sm">
              Nota Interna
            </button>
          </div>
        )}

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
            disabled={(activeTab === 'internal' && !selectedChannelId) || (activeTab === 'patients' && !selectedConvoId)}
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
