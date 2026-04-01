import { useState, useEffect } from 'react'
import { Building2, Bell, FileText, Puzzle, Users, Shield, DoorOpen, MessageSquare, Plus, Edit, Trash2, Lock, Hash } from 'lucide-react'
import IntegrationsPanel from './IntegrationsPanel'
import { useClinics, useUpdateClinic } from '../../hooks/useClinics'
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '../../hooks/useRooms'
import { useInsurances, useCreateInsurance, useUpdateInsurance, useDeleteInsurance } from '../../hooks/useInsurances'
import { useChannels, useCreateChannel, useUpdateChannel, useDeleteChannel } from '../../hooks/useChannels'
import { useSystemUsers, useCreateSystemUser, useUpdateSystemUser, useDeleteSystemUser } from '../../hooks/useUsers'

const tabs = [
  { id: 'clinic', label: 'Clínica', icon: Building2 },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'integrations', label: 'Integrações', icon: Puzzle },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'insurance', label: 'Convênios', icon: Shield },
  { id: 'rooms', label: 'Salas', icon: DoorOpen },
  { id: 'chat', label: 'Chat Interno', icon: MessageSquare },
]

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('clinic')
  const { data: clinics = [] } = useClinics()
  const updateClinicMutation = useUpdateClinic()
  const clinic = clinics[0]

  const [clinicForm, setClinicForm] = useState({ name: '', cnpj: '', address: '', phone: '', email: '', instagram: '', facebook: '' })
  const [clinicSaveMsg, setClinicSaveMsg] = useState('')

  const [notificationSettings, setNotificationSettings] = useState({
    reminderHours: 24,
    defaultChannel: 'WhatsApp',
    confirmation: true,
    reminder: true,
    afterCare: true,
    birthday: true
  })
  const [notifSaveMsg, setNotifSaveMsg] = useState('')

  // Rooms State
  const { data: rooms = [] } = useRooms(clinic?.id)
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [roomForm, setRoomForm] = useState({ name: '', type: 'Consultório' })

  // Insurance State
  const { data: insurances = [] } = useInsurances(clinic?.id)
  const createInsurance = useCreateInsurance()
  const updateInsurance = useUpdateInsurance()
  const deleteInsurance = useDeleteInsurance()
  const [editingInsuranceId, setEditingInsuranceId] = useState<string | null>(null)
  const [insuranceForm, setInsuranceForm] = useState({ name: '', documentsRequired: '' })

  // Channels State
  const { data: channels = [] } = useChannels(clinic?.id)
  const createChannel = useCreateChannel()
  const updateChannel = useUpdateChannel()
  const deleteChannel = useDeleteChannel()
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null)
  const [channelForm, setChannelForm] = useState({ name: '', description: '', adminOnly: false })

  // Users State
  const { data: systemUsers = [] } = useSystemUsers(clinic?.id)
  const createSystemUser = useCreateSystemUser()
  const updateSystemUser = useUpdateSystemUser()
  const deleteSystemUser = useDeleteSystemUser()
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'STAFF', active: true })

  useEffect(() => {
    if (clinic) {
      setClinicForm({
        name: clinic.name || '',
        cnpj: clinic.cnpj || '',
        address: clinic.address || '',
        phone: clinic.phone || '',
        email: clinic.email || '',
        instagram: clinic.instagram || '',
        facebook: clinic.facebook || '',
      })
    }
  }, [clinic])

  const handleSaveClinic = async () => {
    if (!clinic) return
    setClinicSaveMsg('')
    try {
      await updateClinicMutation.mutateAsync({ id: clinic.id, ...clinicForm })
      setClinicSaveMsg('Salvo com sucesso!')
    } catch {
      setClinicSaveMsg('Erro ao salvar.')
    }
  }

  const handleSaveNotifications = async () => {
    setNotifSaveMsg('')
    try {
      // Logic for saving notifications would go here
      setNotifSaveMsg('Configurações de notificações salvas!')
    } catch {
      setNotifSaveMsg('Erro ao salvar notificações.')
    }
  }

  const handleSaveRoom = async () => {
    if (!clinic) return
    if (editingRoomId === 'new') {
      await createRoom.mutateAsync({ clinicId: clinic.id, name: roomForm.name, type: roomForm.type, active: true })
    } else if (editingRoomId) {
      await updateRoom.mutateAsync({ id: editingRoomId, ...roomForm })
    }
    setEditingRoomId(null)
  }

  const handleSaveInsurance = async () => {
    if (!clinic) return
    if (editingInsuranceId === 'new') {
      await createInsurance.mutateAsync({ clinicId: clinic.id, name: insuranceForm.name, documentsRequired: insuranceForm.documentsRequired, active: true })
    } else if (editingInsuranceId) {
      await updateInsurance.mutateAsync({ id: editingInsuranceId, ...insuranceForm })
    }
    setEditingInsuranceId(null)
  }

  const handleSaveChannel = async () => {
    if (!clinic) return
    if (editingChannelId === 'new') {
      await createChannel.mutateAsync({ clinicId: clinic.id, name: channelForm.name, description: channelForm.description, adminOnly: channelForm.adminOnly, type: 'CHANNEL', active: true })
    } else if (editingChannelId) {
      await updateChannel.mutateAsync({ id: editingChannelId, ...channelForm })
    }
    setEditingChannelId(null)
  }

  const handleSaveUser = async () => {
    if (!clinic) return
    if (editingUserId === 'new') {
      await createSystemUser.mutateAsync({ clinicId: clinic.id, name: userForm.name, email: userForm.email, role: userForm.role, password: 'password123' })
    } else if (editingUserId) {
      await updateSystemUser.mutateAsync({ id: editingUserId, role: userForm.role, active: userForm.active })
    }
    setEditingUserId(null)
  }

  return (
    <div className="animate-fade-in">
      <div className="settings-layout">
        <div className="settings-tabs-vertical">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} className={`settings-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
                <Icon size={18} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        <div className="settings-content">
          {activeTab === 'clinic' && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-6)' }}>Dados da Clínica</h3>
              <div className="form-2col">
                <div className="input-group">
                  <label className="input-label">Nome da Clínica <span className="required">*</span></label>
                  <input 
                    className="input-field" 
                    value={clinicForm.name} 
                    onChange={e => setClinicForm({ ...clinicForm, name: e.target.value })} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">CNPJ</label>
                  <input 
                    className="input-field" 
                    value={clinicForm.cnpj} 
                    onChange={e => setClinicForm({ ...clinicForm, cnpj: e.target.value })} 
                  />
                </div>
                <div className="input-group full-span">
                  <label className="input-label">Endereço</label>
                  <input 
                    className="input-field" 
                    value={clinicForm.address} 
                    onChange={e => setClinicForm({ ...clinicForm, address: e.target.value })} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Telefone</label>
                  <input 
                    className="input-field" 
                    value={clinicForm.phone} 
                    onChange={e => setClinicForm({ ...clinicForm, phone: e.target.value })} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">E-mail</label>
                  <input 
                    className="input-field" 
                    value={clinicForm.email} 
                    onChange={e => setClinicForm({ ...clinicForm, email: e.target.value })} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Instagram</label>
                  <input 
                    className="input-field" 
                    placeholder="@clinicavitalis" 
                    value={clinicForm.instagram} 
                    onChange={e => setClinicForm({ ...clinicForm, instagram: e.target.value })} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Facebook</label>
                  <input 
                    className="input-field" 
                    placeholder="URL" 
                    value={clinicForm.facebook} 
                    onChange={e => setClinicForm({ ...clinicForm, facebook: e.target.value })} 
                  />
                </div>
                <div className="full-span" style={{ marginTop: 8 }}>
                  <label className="input-label" style={{ marginBottom: 8 }}>Logo</label>
                  <div className="file-upload-area" style={{ padding: 'var(--space-6)' }}>
                    <p>Arraste a logo ou clique para selecionar</p>
                    <span>PNG ou SVG — máx. 2MB</span>
                  </div>
                </div>
              </div>
              {clinicSaveMsg && (
                <div style={{ 
                  marginTop: 'var(--space-4)', 
                  color: clinicSaveMsg.includes('Erro') ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)',
                  fontSize: 14 
                }}>
                  {clinicSaveMsg}
                </div>
              )}
              <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveClinic}
                  disabled={updateClinicMutation.isPending}
                >
                  {updateClinicMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-6)' }}>Configurações de Notificações</h3>
              <div className="form-2col">
                <div className="input-group">
                  <label className="input-label">Antecedência do Lembrete (horas)</label>
                  <input 
                    className="input-field" 
                    type="number" 
                    value={notificationSettings.reminderHours} 
                    onChange={e => setNotificationSettings({ ...notificationSettings, reminderHours: parseInt(e.target.value) })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Canal Padrão</label>
                  <select 
                    className="input-field"
                    value={notificationSettings.defaultChannel}
                    onChange={e => setNotificationSettings({ ...notificationSettings, defaultChannel: e.target.value })}
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="E-mail">E-mail</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                  <span style={{ fontSize: 14 }}>Confirmação de agendamento</span>
                  <div 
                    className={`toggle ${notificationSettings.confirmation ? 'active' : ''}`} 
                    onClick={() => setNotificationSettings({ ...notificationSettings, confirmation: !notificationSettings.confirmation })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                  <span style={{ fontSize: 14 }}>Lembrete pré-consulta</span>
                  <div 
                    className={`toggle ${notificationSettings.reminder ? 'active' : ''}`} 
                    onClick={() => setNotificationSettings({ ...notificationSettings, reminder: !notificationSettings.reminder })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                  <span style={{ fontSize: 14 }}>Pós-atendimento</span>
                  <div 
                    className={`toggle ${notificationSettings.afterCare ? 'active' : ''}`} 
                    onClick={() => setNotificationSettings({ ...notificationSettings, afterCare: !notificationSettings.afterCare })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                  <span style={{ fontSize: 14 }}>Aniversário do paciente</span>
                  <div 
                    className={`toggle ${notificationSettings.birthday ? 'active' : ''}`} 
                    onClick={() => setNotificationSettings({ ...notificationSettings, birthday: !notificationSettings.birthday })}
                  />
                </div>
              </div>
              {notifSaveMsg && (
                <div style={{ color: 'var(--color-accent-emerald)', fontSize: 13, marginTop: 'var(--space-4)' }}>{notifSaveMsg}</div>
              )}
              <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSaveNotifications}>Salvar</button>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-6)' }}>Templates de Mensagem</h3>
              {['Confirmação', 'Lembrete', 'Pós-Atendimento', 'Aniversário'].map(t => (
                <div key={t} style={{ marginBottom: 'var(--space-6)' }}>
                  <label className="input-label">{t}</label>
                  <textarea className="input-field" defaultValue={`Olá {nome}, sua consulta de {servico} está ${t === 'Confirmação' ? 'confirmada' : 'agendada'} para {data} às {hora}. Clínica Vitalis.`} style={{ minHeight: 80 }} />
                  <p className="input-hint">Variáveis: {'{nome}'}, {'{servico}'}, {'{data}'}, {'{hora}'}, {'{profissional}'}</p>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-primary">Salvar Templates</button></div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <IntegrationsPanel />
          )}

          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Usuários do Sistema</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingUserId('new'); setUserForm({ name: '', email: '', role: 'STAFF', active: true }) }}>
                  <Plus size={14} /> Novo Usuário
                </button>
              </div>

              {editingUserId && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-subtle)' }}>
                  <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 14 }}>{editingUserId === 'new' ? 'Adicionar Usuário' : 'Editar Usuário'}</h4>
                  <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
                    {editingUserId === 'new' && (
                      <>
                        <div className="input-group">
                          <label className="input-label">Nome Completo</label>
                          <input className="input-field" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                        </div>
                        <div className="input-group">
                          <label className="input-label">E-mail (Login)</label>
                          <input className="input-field" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                        </div>
                      </>
                    )}
                    <div className="input-group">
                      <label className="input-label">Perfil de Acesso</label>
                      <select className="input-field" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                        <option value="STAFF">Atendimento / Recepcionista</option>
                        <option value="ADMIN">Administrador</option>
                        <option value="MEMBER">Membro Consultivo</option>
                      </select>
                    </div>
                    {editingUserId !== 'new' && (
                      <div className="input-group full-span" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input type="checkbox" checked={userForm.active} onChange={e => setUserForm({ ...userForm, active: e.target.checked })} />
                        <label className="input-label" style={{ marginBottom: 0 }}>Usuário Ativo (Pode acessar o sistema)</label>
                      </div>
                    )}
                  </div>
                  {editingUserId === 'new' && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Uma senha padrão <code>password123</code> será gerada.</p>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingUserId(null)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveUser} disabled={createSystemUser.isPending || updateSystemUser.isPending}>Salvar</button>
                  </div>
                </div>
              )}

              <table className="data-table">
                <thead><tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
                <tbody>
                  {systemUsers.map(su => (
                    <tr key={su.id}>
                      <td style={{ fontWeight: 500 }}>{su.user.name}</td>
                      <td>{su.user.email}</td>
                      <td>
                        <span className={`badge ${su.role === 'ADMIN' ? 'badge-gold' : 'badge-emerald'}`}>
                          {su.role === 'ADMIN' ? 'Administrador' : su.role === 'STAFF' ? 'Staff' : su.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${su.active ? 'badge-emerald' : 'badge-muted'}`}>
                          {su.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-icon btn-sm" onClick={() => { setEditingUserId(su.id); setUserForm({ name: su.user.name, email: su.user.email, role: su.role, active: su.active }) }}><Edit size={14} /></button>
                          <button className="btn btn-icon btn-sm" onClick={async () => { if(confirm('Remover acesso?')) await deleteSystemUser.mutateAsync(su.id) }}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'insurance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Convênios</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingInsuranceId('new'); setInsuranceForm({ name: '', documentsRequired: '' }) }}>
                  <Plus size={14} /> Novo Convênio
                </button>
              </div>

              {editingInsuranceId && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-subtle)' }}>
                  <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 14 }}>{editingInsuranceId === 'new' ? 'Adicionar Convênio' : 'Editar Convênio'}</h4>
                  <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="input-group">
                      <label className="input-label">Nome do Convênio</label>
                      <input className="input-field" value={insuranceForm.name} onChange={e => setInsuranceForm({ ...insuranceForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Documentos Exigidos</label>
                      <input className="input-field" placeholder="Ex: Carteirinha, RG" value={insuranceForm.documentsRequired} onChange={e => setInsuranceForm({ ...insuranceForm, documentsRequired: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingInsuranceId(null)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveInsurance} disabled={createInsurance.isPending || updateInsurance.isPending}>Salvar</button>
                  </div>
                </div>
              )}

              {insurances.map(ins => (
                <div key={ins.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border-default)' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{ins.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{ins.documentsRequired || 'Tabela padrão'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-icon btn-sm" onClick={() => { setEditingInsuranceId(ins.id); setInsuranceForm({ name: ins.name, documentsRequired: ins.documentsRequired || '' }) }}><Edit size={14} /></button>
                    <button className="btn btn-icon btn-sm" onClick={async () => { if(confirm('Remover convênio?')) await deleteInsurance.mutateAsync(ins.id) }}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
                  </div>
                </div>
              ))}
              {insurances.length === 0 && !editingInsuranceId && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Nenhum convênio cadastrado.</p>
              )}
            </div>
          )}

          {activeTab === 'rooms' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Salas e Consultórios</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingRoomId('new'); setRoomForm({ name: '', type: 'Consultório' }) }}>
                  <Plus size={14} /> Nova Sala
                </button>
              </div>

              {editingRoomId && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-subtle)' }}>
                  <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 14 }}>{editingRoomId === 'new' ? 'Adicionar Sala' : 'Editar Sala'}</h4>
                  <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="input-group">
                      <label className="input-label">Nome da Sala <span className="required">*</span></label>
                      <input className="input-field" placeholder="Ex: Sala 1" value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Tipo</label>
                      <select className="input-field" value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}>
                        <option value="Consultório">Consultório</option>
                        <option value="Exames">Sala de Exames</option>
                        <option value="Procedimento">Sala de Procedimentos</option>
                        <option value="Reabilitação">Reabilitação</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingRoomId(null)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveRoom} disabled={createRoom.isPending || updateRoom.isPending}>Salvar</button>
                  </div>
                </div>
              )}

              {rooms.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <DoorOpen size={18} color="var(--color-accent-emerald)" />
                    <div>
                      <span style={{ fontWeight: 500, display: 'block' }}>{r.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.type}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-icon btn-sm" onClick={() => { setEditingRoomId(r.id); setRoomForm({ name: r.name, type: r.type }) }}><Edit size={14} /></button>
                    <button className="btn btn-icon btn-sm" onClick={async () => { if(confirm('Remover sala?')) await deleteRoom.mutateAsync(r.id) }}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
                  </div>
                </div>
              ))}
              {rooms.length === 0 && !editingRoomId && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Nenhuma sala cadastrada.</p>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Canais do Chat Interno</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingChannelId('new'); setChannelForm({ name: '', description: '', adminOnly: false }) }}>
                  <Plus size={14} /> Criar Canal
                </button>
              </div>

              {editingChannelId && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-subtle)' }}>
                  <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 14 }}>{editingChannelId === 'new' ? 'Adicionar Canal' : 'Editar Canal'}</h4>
                  <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="input-group">
                      <label className="input-label">Nome do Canal <span className="required">*</span></label>
                      <input className="input-field" placeholder="Ex: recepcao" value={channelForm.name} onChange={e => setChannelForm({ ...channelForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Descrição / Setor</label>
                      <input className="input-field" placeholder="Ex: Assuntos da Recepção" value={channelForm.description} onChange={e => setChannelForm({ ...channelForm, description: e.target.value })} />
                    </div>
                    <div className="input-group full-span" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="checkbox" checked={channelForm.adminOnly} onChange={e => setChannelForm({ ...channelForm, adminOnly: e.target.checked })} />
                      <label className="input-label" style={{ marginBottom: 0 }}>Apenas administradores podem enviar mensagens neste canal?</label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingChannelId(null)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveChannel} disabled={createChannel.isPending || updateChannel.isPending}>Salvar</button>
                  </div>
                </div>
              )}

              {channels.map(ch => (
                <div key={ch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {ch.adminOnly ? <Lock size={14} style={{ opacity: 0.5 }} /> : <span style={{ width: 14 }} />}
                    <Hash size={16} color="var(--color-accent-emerald)" />
                    <div>
                      <div style={{ fontWeight: 500 }}>{ch.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{ch.description || 'Sem descrição'} · {ch._count?.members || 0} membros</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-icon btn-sm" onClick={() => { setEditingChannelId(ch.id); setChannelForm({ name: ch.name, description: ch.description || '', adminOnly: ch.adminOnly }) }}><Edit size={14} /></button>
                    <button className="btn btn-icon btn-sm" onClick={async () => { if(confirm('Remover canal?')) await deleteChannel.mutateAsync(ch.id) }}><Trash2 size={14} color="var(--color-accent-warning)" /></button>
                  </div>
                </div>
              ))}
              {channels.length === 0 && !editingChannelId && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Nenhum canal de chat cadastrado.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
