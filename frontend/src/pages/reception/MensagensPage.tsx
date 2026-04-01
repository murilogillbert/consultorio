import { useState } from 'react'
import { Search, Send, Paperclip, Smile, CreditCard, CalendarPlus, MoreVertical, Hash, Lock, Users, Pin, MessageSquare, Star, Phone, Mail, MessageCircle as WhatsAppIcon } from 'lucide-react'

const patientConversations = [
  { name: 'João Silva', preview: 'Obrigado pela informação!', time: '14:35', unread: 2, channel: 'whatsapp' },
  { name: 'Maria Oliveira', preview: 'Qual o horário disponível?', time: '13:20', unread: 0, channel: 'whatsapp' },
  { name: 'Pedro Santos', preview: 'Recebi o boleto, obrigado', time: '11:45', unread: 0, channel: 'email' },
  { name: 'Ana Lima', preview: 'Gostaria de remarcar minha consulta', time: 'Ontem', unread: 1, channel: 'chat' },
  { name: 'Carlos Ferreira', preview: 'Vocês aceitam Unimed?', time: 'Ontem', unread: 0, channel: 'whatsapp' },
]

const chatMessages = [
  { from: 'patient', text: 'Olá, gostaria de agendar uma consulta com o Dr. Carlos.', time: '14:20' },
  { from: 'team', text: 'Olá, João! Claro. O Dr. Carlos tem horário disponível na quarta-feira às 10h ou na quinta às 14h. Qual prefere?', time: '14:22' },
  { from: 'patient', text: 'Quinta às 14h seria perfeito!', time: '14:30' },
  { from: 'team', text: 'Ótimo! Agendado para quinta-feira, 02/04, às 14h com o Dr. Carlos Mendes. Consulta neurológica. Enviarei um lembrete no dia anterior. 😊', time: '14:32' },
  { from: 'patient', text: 'Obrigado pela informação!', time: '14:35' },
]

const internalChannels = [
  { name: 'recepcao', type: 'sector', members: 5 },
  { name: 'enfermagem', type: 'sector', members: 8 },
  { name: 'financeiro', type: 'sector', members: 3 },
]

const internalGroups = [
  { name: 'Escala Semana 31/03', members: 4 },
  { name: 'Equipamento Sala 3', members: 3 },
]

const internalDMs = [
  { name: 'Dra. Maria Santos', status: 'online', lastMsg: 'Ok, obrigada!', time: '14:10' },
  { name: 'Dr. Carlos Mendes', status: 'busy', lastMsg: 'Paciente encaminhado', time: '13:55' },
  { name: 'Roberta Enfermagem', status: 'online', lastMsg: 'Sala preparada', time: '12:30' },
]

const internalMessages = [
  { from: 'Roberta Enfermagem', text: 'Sala 2 já está preparada para o próximo paciente.', time: '14:05', readBy: 3 },
  { from: 'me', text: 'Perfeito! O paciente João Silva já está na recepção. Pode encaminhá-lo?', time: '14:06', readBy: 2 },
  { from: 'Roberta Enfermagem', text: 'Sim, pode mandar! 👍', time: '14:07', readBy: 3, pinned: true },
]

const channelIcon = (ch: string) => {
  if (ch === 'whatsapp') return <WhatsAppIcon size={14} color="var(--color-accent-emerald)" />
  if (ch === 'email') return <Mail size={14} color="var(--color-accent-gold)" />
  return <MessageSquare size={14} color="var(--color-text-muted)" />
}

export default function MensagensPage() {
  const [activeTab, setActiveTab] = useState<'patients' | 'internal'>('patients')
  const [selectedConvo, setSelectedConvo] = useState(0)
  const [selectedChannel, setSelectedChannel] = useState('recepcao')
  const [message, setMessage] = useState('')

  return (
    <div className="messages-layout" style={{ margin: 'calc(var(--space-8) * -1)', height: 'calc(100vh - var(--topbar-height))' }}>
      {/* Left Panel -> conversation list */}
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

        {activeTab === 'patients' && (
          <>
            <div style={{ padding: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
              {['all', 'whatsapp', 'email', 'chat'].map(ch => (
                <button key={ch} className="btn btn-icon btn-sm" style={{ border: '1px solid var(--color-border-default)' }} title={ch}>
                  {ch === 'all' ? <MessageSquare size={14} /> : ch === 'whatsapp' ? <WhatsAppIcon size={14} /> : ch === 'email' ? <Mail size={14} /> : <Phone size={14} />}
                </button>
              ))}
            </div>
            <div className="messages-list-body">
              {patientConversations.map((c, i) => (
                <div key={i} className={`conversation-row${selectedConvo === i ? ' active' : ''}`} onClick={() => setSelectedConvo(i)}>
                  <div className="avatar avatar-sm avatar-placeholder">
                    {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="conversation-info">
                    <div className="name">
                      {channelIcon(c.channel)}
                      <span style={{ marginLeft: 6 }}>{c.name}</span>
                    </div>
                    <div className="preview">{c.preview}</div>
                  </div>
                  <div className="conversation-meta">
                    <span className="time">{c.time}</span>
                    {c.unread > 0 && <span className="badge-count">{c.unread}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'internal' && (
          <div className="messages-list-body">
            <div className="channel-section-title">Canais</div>
            {internalChannels.map((ch, i) => (
              <div key={i} className={`channel-item${selectedChannel === ch.name ? ' active' : ''}`} onClick={() => setSelectedChannel(ch.name)}>
                <Lock size={12} style={{ opacity: 0.5 }} />
                <Hash size={14} />
                <span style={{ flex: 1 }}>{ch.name}</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{ch.members}</span>
              </div>
            ))}
            <div className="channel-section-title" style={{ marginTop: 12 }}>Grupos</div>
            {internalGroups.map((g, i) => (
              <div key={i} className="channel-item">
                <Users size={14} />
                <span style={{ flex: 1 }}>{g.name}</span>
              </div>
            ))}
            <div className="channel-section-title" style={{ marginTop: 12 }}>Mensagens Diretas</div>
            {internalDMs.map((dm, i) => (
              <div key={i} className="channel-item">
                <div style={{ position: 'relative' }}>
                  <div className="avatar avatar-sm avatar-placeholder" style={{ width: 24, height: 24, fontSize: 9 }}>
                    {dm.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className={`badge-dot badge-dot-${dm.status === 'online' ? 'emerald' : dm.status === 'busy' ? 'gold' : 'danger'}`}
                    style={{ position: 'absolute', bottom: -1, right: -1 }} />
                </div>
                <span style={{ flex: 1, fontSize: 13 }}>{dm.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="chat-panel">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="avatar avatar-sm avatar-placeholder">
              {activeTab === 'patients' ? patientConversations[selectedConvo].name.split(' ').map(n => n[0]).join('').slice(0, 2) : '#'}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>
                {activeTab === 'patients' ? patientConversations[selectedConvo].name : `#${selectedChannel}`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {activeTab === 'patients' ? (
                  <>{channelIcon(patientConversations[selectedConvo].channel)} <span style={{ marginLeft: 4 }}>WhatsApp</span></>
                ) : (
                  `${internalChannels.find(c => c.name === selectedChannel)?.members || 0} membros`
                )}
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

        <div className="chat-messages">
          {(activeTab === 'patients' ? chatMessages : internalMessages).map((msg, i) => {
            const isOutgoing = activeTab === 'patients' ? msg.from === 'team' : ('from' in msg && msg.from === 'me')
            const internalMsg = msg as typeof internalMessages[0]
            return (
              <div key={i} style={{ alignSelf: isOutgoing ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                {activeTab === 'internal' && !isOutgoing && (
                  <div style={{ fontSize: 11, color: 'var(--color-accent-emerald)', marginBottom: 2, fontWeight: 500 }}>
                    {internalMsg.from}
                  </div>
                )}
                <div className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                  {msg.text}
                  <div className="time">{msg.time}</div>
                </div>
                {activeTab === 'internal' && 'readBy' in msg && (
                  <div className="read-receipt">
                    Visto por {(msg as typeof internalMessages[0]).readBy} pessoas
                    {(msg as typeof internalMessages[0]).pinned && (
                      <Pin size={10} style={{ marginLeft: 6, display: 'inline' }} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
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

        <div className="chat-input-bar">
          <button className="btn btn-icon btn-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Smile size={18} />
          </button>
          <button className="btn btn-icon btn-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Paperclip size={18} />
          </button>
          <input placeholder="Digite sua mensagem..." value={message} onChange={e => setMessage(e.target.value)} />
          <button className="btn btn-primary btn-icon">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
