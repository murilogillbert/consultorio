import { useState, useEffect, useRef } from 'react'
import { Building2, Bell, FileText, Puzzle, Users, Shield, DoorOpen, MessageSquare, Plus, Edit, Trash2, Lock, Hash, Info, Briefcase, X, Camera, Wrench } from 'lucide-react'
import IntegrationsPanel from './IntegrationsPanel'
import { useClinics, useUpdateClinic } from '../../hooks/useClinics'
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '../../hooks/useRooms'
import { useInsurances, useCreateInsurance, useUpdateInsurance, useDeleteInsurance } from '../../hooks/useInsurances'
import { useChannels, useCreateChannel, useUpdateChannel, useDeleteChannel } from '../../hooks/useChannels'
import { useSystemUsers, useCreateSystemUser, useUpdateSystemUser, useDeleteSystemUser } from '../../hooks/useUsers'
import { useJobOpenings, useCreateJobOpening, useUpdateJobOpening, useDeleteJobOpening } from '../../hooks/useJobs'
import { useBanners, useCreateBanner, useUpdateBanner, useDeleteBanner } from '../../hooks/useBanners'
import { useEquipments, useCreateEquipment, useUpdateEquipment, useDeleteEquipment } from '../../hooks/useEquipment'
import { useUpload } from '../../hooks/useUpload'

const PERMISSIONS_LIST = [
  { key: 'agenda.view', label: 'Ver Agenda' },
  { key: 'agenda.manage', label: 'Gerenciar Agenda' },
  { key: 'patients.view', label: 'Ver Pacientes' },
  { key: 'patients.manage', label: 'Gerenciar Pacientes' },
  { key: 'billing.view', label: 'Ver Financeiro' },
  { key: 'billing.manage', label: 'Gerenciar Financeiro' },
  { key: 'settings.view', label: 'Ver Configurações' },
  { key: 'settings.manage', label: 'Gerenciar Configurações' },
  { key: 'chat.access', label: 'Acesso ao Chat' },
]

const tabs = [
  { id: 'clinic', label: 'Clínica', icon: Building2 },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'integrations', label: 'Integrações', icon: Puzzle },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'insurance', label: 'Convênios', icon: Shield },
  { id: 'rooms', label: 'Salas', icon: DoorOpen },
  { id: 'equipment', label: 'Equipamentos', icon: Wrench },
  { id: 'chat', label: 'Chat Interno', icon: MessageSquare },
  { id: 'about', label: 'Sobre', icon: Info },
  { id: 'jobs', label: 'Vagas', icon: Briefcase },
  { id: 'banners', label: 'Banners', icon: Camera },
]

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('clinic')
  const { data: clinics = [] } = useClinics()
  const updateClinicMutation = useUpdateClinic()
  const clinic = clinics[0]

  const [clinicForm, setClinicForm] = useState({ name: '', cnpj: '', address: '', phone: '', email: '', instagram: '', facebook: '' })
  const [clinicSaveMsg, setClinicSaveMsg] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, uploadMultiple, uploading } = useUpload()

  const NOTIF_KEY = 'clinic_notification_settings'
  const [notificationSettings, setNotificationSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTIF_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return { reminderHours: 24, defaultChannel: 'WhatsApp', confirmation: true, reminder: true, afterCare: true, birthday: true }
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

  // About State
  const [aboutForm, setAboutForm] = useState({ mission: '', vision: '', values: '', milestones: [] as { year: string; title: string; description: string }[], galleryUrls: [] as string[] })
  const [aboutSaveMsg, setAboutSaveMsg] = useState('')
  const [newMilestone, setNewMilestone] = useState({ year: '', title: '', description: '' })

  // Jobs State
  const { data: jobOpenings = [] } = useJobOpenings()
  const createJob = useCreateJobOpening()
  const updateJob = useUpdateJobOpening()
  const deleteJob = useDeleteJobOpening()
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [jobForm, setJobForm] = useState({ title: '', area: '', regime: 'CLT', location: '', hours: '', requirements: '', responsibilities: '', benefits: '', expiresAt: '' })

  // Banners State
  const { data: bannersData = [] } = useBanners()
  const createBanner = useCreateBanner()
  const updateBanner = useUpdateBanner()
  const deleteBanner = useDeleteBanner()
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null)
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', imageUrl: '', ctaLabel: '', ctaUrl: '', order: 0, active: true })
  const bannerImageRef = useRef<HTMLInputElement>(null)
  const [bannerUploading, setBannerUploading] = useState(false)

  // Equipment State
  const { data: equipments = [] } = useEquipments(clinic?.id)
  const createEquipment = useCreateEquipment()
  const updateEquipment = useUpdateEquipment()
  const deleteEquipment = useDeleteEquipment()
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null)
  const [equipmentForm, setEquipmentForm] = useState({ name: '', category: '', serialNumber: '', isMobile: true, defaultRoomId: '', status: 'AVAILABLE', notes: '' })

  // Users State
  const { data: systemUsers = [] } = useSystemUsers(clinic?.id)
  const createSystemUser = useCreateSystemUser()
  const updateSystemUser = useUpdateSystemUser()
  const deleteSystemUser = useDeleteSystemUser()
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'STAFF', active: true, permissions: {} as Record<string, boolean> })

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
      setAboutForm({
        mission: (clinic as any).mission || '',
        vision: (clinic as any).vision || '',
        values: (clinic as any).values || '',
        milestones: (clinic as any).milestones || [],
        galleryUrls: (clinic as any).galleryUrls || [],
      })
      if (clinic.logoUrl) setLogoPreview(clinic.logoUrl)
    }
  }, [clinic])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !clinic) return
    try {
      const result = await uploadFile(file)
      setLogoPreview(result.fileUrl)
      await updateClinicMutation.mutateAsync({ id: clinic.id, logoUrl: result.fileUrl })
      setClinicSaveMsg('Logo atualizada!')
    } catch {
      setClinicSaveMsg('Erro ao enviar logo.')
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      const results = await uploadMultiple(Array.from(files))
      const newUrls = results.map(r => r.fileUrl)
      setAboutForm(prev => ({ ...prev, galleryUrls: [...prev.galleryUrls, ...newUrls] }))
    } catch {
      setAboutSaveMsg('Erro ao enviar imagens.')
    }
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

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

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notificationSettings))
      setNotifSaveMsg('Configurações salvas!')
    } catch {
      setNotifSaveMsg('Erro ao salvar configurações.')
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

  const handleSaveEquipment = async () => {
    if (!clinic) return
    const payload = {
      ...equipmentForm,
      clinicId: clinic.id,
      isMobile: equipmentForm.isMobile,
      defaultRoomId: equipmentForm.defaultRoomId || undefined,
      serialNumber: equipmentForm.serialNumber || undefined,
      notes: equipmentForm.notes || undefined,
    }
    if (editingEquipmentId === 'new') {
      await createEquipment.mutateAsync(payload)
    } else if (editingEquipmentId) {
      await updateEquipment.mutateAsync({ id: editingEquipmentId, ...payload })
    }
    setEditingEquipmentId(null)
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

  const handleSaveAbout = async () => {
    if (!clinic) return
    setAboutSaveMsg('')
    try {
      await updateClinicMutation.mutateAsync({ id: clinic.id, mission: aboutForm.mission, vision: aboutForm.vision, values: aboutForm.values, milestones: aboutForm.milestones, galleryUrls: aboutForm.galleryUrls })
      setAboutSaveMsg('Salvo com sucesso!')
    } catch {
      setAboutSaveMsg('Erro ao salvar.')
    }
  }

  const handleAddMilestone = () => {
    if (!newMilestone.year || !newMilestone.title) return
    setAboutForm({ ...aboutForm, milestones: [...aboutForm.milestones, { ...newMilestone }] })
    setNewMilestone({ year: '', title: '', description: '' })
  }

  const handleRemoveMilestone = (idx: number) => {
    setAboutForm({ ...aboutForm, milestones: aboutForm.milestones.filter((_, i) => i !== idx) })
  }

  const handleSaveJob = async () => {
    if (!clinic) return
    if (editingJobId === 'new') {
      await createJob.mutateAsync({ clinicId: clinic.id, ...jobForm, ...(jobForm.expiresAt ? { expiresAt: jobForm.expiresAt } : {}) })
    } else if (editingJobId) {
      await updateJob.mutateAsync({ id: editingJobId, ...jobForm })
    }
    setEditingJobId(null)
  }

  const handleSaveBanner = async () => {
    if (!clinic) return
    if (editingBannerId === 'new') {
      await createBanner.mutateAsync({ clinicId: clinic.id, ...bannerForm })
    } else if (editingBannerId) {
      await updateBanner.mutateAsync({ id: editingBannerId, ...bannerForm })
    }
    setEditingBannerId(null)
  }

  const handleSaveUser = async () => {
    if (!clinic) return
    if (editingUserId === 'new') {
      await createSystemUser.mutateAsync({ clinicId: clinic.id, name: userForm.name, email: userForm.email, role: userForm.role, password: 'password123', permissions: userForm.permissions })
    } else if (editingUserId) {
      await updateSystemUser.mutateAsync({ id: editingUserId, role: userForm.role, active: userForm.active, permissions: userForm.permissions })
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
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />
                  <div
                    className="file-upload-area"
                    style={{ padding: 'var(--space-6)', position: 'relative' }}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain' }} />
                    ) : (
                      <>
                        <Camera size={32} />
                        <p>Clique para selecionar a logo</p>
                      </>
                    )}
                    <span>{uploading ? 'Enviando...' : 'PNG, SVG, JPG ou WebP — máx. 5MB'}</span>
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
            <IntegrationsPanel clinicId={clinic?.id} />
          )}

          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Usuários do Sistema</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingUserId('new'); setUserForm({ name: '', email: '', role: 'STAFF', active: true, permissions: {} }) }}>
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

                  <div style={{ marginBottom: 'var(--space-6)' }}>
                    <label className="input-label" style={{ marginBottom: 'var(--space-3)' }}>Permissões Granulares</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                      {PERMISSIONS_LIST.map(p => (
                        <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={!!userForm.permissions[p.key]} 
                            onChange={e => {
                              setUserForm({
                                ...userForm,
                                permissions: { ...userForm.permissions, [p.key]: e.target.checked }
                              })
                            }} 
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
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
                          <button className="btn btn-icon btn-sm" onClick={() => { setEditingUserId(su.id); setUserForm({ name: su.user.name, email: su.user.email, role: su.role, active: su.active, permissions: (su.permissions as Record<string, boolean>) || {} }) }}><Edit size={14} /></button>
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

          {activeTab === 'equipment' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Equipamentos</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingEquipmentId('new'); setEquipmentForm({ name: '', category: '', serialNumber: '', isMobile: true, defaultRoomId: '', status: 'AVAILABLE', notes: '' }) }}>
                  <Plus size={14} /> Novo Equipamento
                </button>
              </div>

              {editingEquipmentId && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-subtle)' }}>
                  <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 14 }}>{editingEquipmentId === 'new' ? 'Adicionar Equipamento' : 'Editar Equipamento'}</h4>
                  <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="input-group">
                      <label className="input-label">Nome <span className="required">*</span></label>
                      <input className="input-field" placeholder="Ex: Ultrassom Portátil" value={equipmentForm.name} onChange={e => setEquipmentForm({ ...equipmentForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Categoria <span className="required">*</span></label>
                      <input className="input-field" placeholder="Ex: Ultrassom, Laser, Monitor" value={equipmentForm.category} onChange={e => setEquipmentForm({ ...equipmentForm, category: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Número de Série</label>
                      <input className="input-field" placeholder="Ex: SN-12345" value={equipmentForm.serialNumber} onChange={e => setEquipmentForm({ ...equipmentForm, serialNumber: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Status</label>
                      <select className="input-field" value={equipmentForm.status} onChange={e => setEquipmentForm({ ...equipmentForm, status: e.target.value })}>
                        <option value="AVAILABLE">Disponível</option>
                        <option value="IN_USE">Em Uso</option>
                        <option value="MAINTENANCE">Manutenção</option>
                        <option value="RETIRED">Aposentado</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Sala Padrão</label>
                      <select className="input-field" value={equipmentForm.defaultRoomId} onChange={e => setEquipmentForm({ ...equipmentForm, defaultRoomId: e.target.value })}>
                        <option value="">Nenhuma (Móvel)</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 12, height: '100%' }}>
                      <input type="checkbox" checked={equipmentForm.isMobile} onChange={e => setEquipmentForm({ ...equipmentForm, isMobile: e.target.checked })} />
                      <label className="input-label" style={{ marginBottom: 0 }}>Equipamento Móvel</label>
                    </div>
                    <div className="input-group full-span">
                      <label className="input-label">Observações</label>
                      <textarea className="input-field" placeholder="Notas adicionais sobre o equipamento..." value={equipmentForm.notes} onChange={e => setEquipmentForm({ ...equipmentForm, notes: e.target.value })} style={{ minHeight: 60 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingEquipmentId(null)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveEquipment} disabled={createEquipment.isPending || updateEquipment.isPending}>Salvar</button>
                  </div>
                </div>
              )}

              {equipments.map(eq => (
                <div key={eq.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Wrench size={18} color="var(--color-accent-emerald)" />
                    <div>
                      <span style={{ fontWeight: 500, display: 'block' }}>{eq.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {eq.category} · {eq.serialNumber || 'Sem S/N'} · {eq.isMobile ? 'Móvel' : 'Fixo'} · {eq.status === 'AVAILABLE' ? 'Disponível' : eq.status === 'IN_USE' ? 'Em Uso' : eq.status === 'MAINTENANCE' ? 'Manutenção' : 'Aposentado'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-icon btn-sm" onClick={() => { setEditingEquipmentId(eq.id); setEquipmentForm({ name: eq.name, category: eq.category, serialNumber: eq.serialNumber || '', isMobile: eq.isMobile, defaultRoomId: eq.defaultRoomId || '', status: eq.status, notes: eq.notes || '' }) }}><Edit size={14} /></button>
                    <button className="btn btn-icon btn-sm" onClick={async () => { if(confirm('Remover equipamento?')) await deleteEquipment.mutateAsync(eq.id) }}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
                  </div>
                </div>
              ))}
              {equipments.length === 0 && !editingEquipmentId && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Nenhum equipamento cadastrado.</p>
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

          {activeTab === 'about' && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-6)' }}>Página Sobre</h3>

              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label className="input-label">Missão</label>
                <textarea className="input-field" style={{ minHeight: 80 }} value={aboutForm.mission} onChange={e => setAboutForm({ ...aboutForm, mission: e.target.value })} placeholder="Proporcionar saúde e bem-estar com atendimento humanizado..." />
              </div>
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label className="input-label">Visão</label>
                <textarea className="input-field" style={{ minHeight: 80 }} value={aboutForm.vision} onChange={e => setAboutForm({ ...aboutForm, vision: e.target.value })} placeholder="Ser referência nacional em excelência médica..." />
              </div>
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label className="input-label">Valores</label>
                <textarea className="input-field" style={{ minHeight: 80 }} value={aboutForm.values} onChange={e => setAboutForm({ ...aboutForm, values: e.target.value })} placeholder="Ética, empatia, excelência, inovação contínua..." />
              </div>

              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label className="input-label" style={{ marginBottom: 'var(--space-3)' }}>Marcos na Trajetória</label>
                {aboutForm.milestones.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 12px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <strong style={{ minWidth: 50 }}>{m.year}</strong>
                    <span style={{ flex: 1 }}>{m.title} — {m.description}</span>
                    <button className="btn btn-icon btn-sm" onClick={() => handleRemoveMilestone(i)}><X size={14} color="var(--color-accent-danger)" /></button>
                  </div>
                ))}
                <div className="form-2col" style={{ marginTop: 'var(--space-3)' }}>
                  <div className="input-group">
                    <input className="input-field" placeholder="Ano (ex: 2004)" value={newMilestone.year} onChange={e => setNewMilestone({ ...newMilestone, year: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <input className="input-field" placeholder="Título (ex: Fundação)" value={newMilestone.title} onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })} />
                  </div>
                  <div className="input-group full-span">
                    <input className="input-field" placeholder="Descrição do marco" value={newMilestone.description} onChange={e => setNewMilestone({ ...newMilestone, description: e.target.value })} />
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={handleAddMilestone}>
                  <Plus size={14} /> Adicionar Marco
                </button>
              </div>

              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label className="input-label" style={{ marginBottom: 'var(--space-3)' }}>Galeria de Imagens</label>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleGalleryUpload}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 'var(--space-4)' }}>
                  {aboutForm.galleryUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border-default)' }}>
                      <img src={url} alt={`Galeria ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        className="btn btn-icon btn-sm"
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-full)' }}
                        onClick={() => setAboutForm({ ...aboutForm, galleryUrls: aboutForm.galleryUrls.filter((_, j) => j !== i) })}
                      >
                        <X size={14} color="white" />
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => galleryInputRef.current?.click()} disabled={uploading}>
                  <Camera size={14} /> {uploading ? 'Enviando...' : 'Adicionar Imagens'}
                </button>
              </div>

              {aboutSaveMsg && (
                <div style={{ marginTop: 'var(--space-4)', color: aboutSaveMsg.includes('Erro') ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)', fontSize: 14 }}>
                  {aboutSaveMsg}
                </div>
              )}
              <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSaveAbout} disabled={updateClinicMutation.isPending}>
                  {updateClinicMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Vagas de Emprego</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingJobId('new'); setJobForm({ title: '', area: '', regime: 'CLT', location: '', hours: '', requirements: '', responsibilities: '', benefits: '', expiresAt: '' }) }}>
                  <Plus size={14} /> Nova Vaga
                </button>
              </div>

              {editingJobId && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-subtle)' }}>
                  <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 14 }}>{editingJobId === 'new' ? 'Criar Vaga' : 'Editar Vaga'}</h4>
                  <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="input-group">
                      <label className="input-label">Título da Vaga <span className="required">*</span></label>
                      <input className="input-field" value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} placeholder="Ex: Recepcionista" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Área</label>
                      <input className="input-field" value={jobForm.area} onChange={e => setJobForm({ ...jobForm, area: e.target.value })} placeholder="Ex: Atendimento" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Regime</label>
                      <select className="input-field" value={jobForm.regime} onChange={e => setJobForm({ ...jobForm, regime: e.target.value })}>
                        <option value="CLT">CLT</option>
                        <option value="PJ">PJ</option>
                        <option value="Estágio">Estágio</option>
                        <option value="Temporário">Temporário</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Localização</label>
                      <input className="input-field" value={jobForm.location} onChange={e => setJobForm({ ...jobForm, location: e.target.value })} placeholder="Ex: São Paulo — Jardim Paulista" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Horário</label>
                      <input className="input-field" value={jobForm.hours} onChange={e => setJobForm({ ...jobForm, hours: e.target.value })} placeholder="Ex: Segunda a Sexta, 08h às 17h" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Prazo para Candidatura</label>
                      <input className="input-field" type="date" value={jobForm.expiresAt} onChange={e => setJobForm({ ...jobForm, expiresAt: e.target.value })} />
                    </div>
                    <div className="input-group full-span">
                      <label className="input-label">Requisitos (um por linha)</label>
                      <textarea className="input-field" style={{ minHeight: 80 }} value={jobForm.requirements} onChange={e => setJobForm({ ...jobForm, requirements: e.target.value })} placeholder="Ensino médio completo&#10;Experiência com atendimento" />
                    </div>
                    <div className="input-group full-span">
                      <label className="input-label">Responsabilidades (uma por linha)</label>
                      <textarea className="input-field" style={{ minHeight: 80 }} value={jobForm.responsibilities} onChange={e => setJobForm({ ...jobForm, responsibilities: e.target.value })} placeholder="Recepcionar pacientes&#10;Realizar agendamentos" />
                    </div>
                    <div className="input-group full-span">
                      <label className="input-label">Benefícios (um por linha)</label>
                      <textarea className="input-field" style={{ minHeight: 60 }} value={jobForm.benefits} onChange={e => setJobForm({ ...jobForm, benefits: e.target.value })} placeholder="Plano de saúde&#10;Vale-refeição" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingJobId(null)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveJob} disabled={createJob.isPending || updateJob.isPending}>Salvar</button>
                  </div>
                </div>
              )}

              <table className="data-table">
                <thead><tr><th>Vaga</th><th>Área</th><th>Regime</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
                <tbody>
                  {jobOpenings.map(job => (
                    <tr key={job.id}>
                      <td style={{ fontWeight: 500 }}>{job.title}</td>
                      <td>{job.area || '—'}</td>
                      <td><span className="badge badge-emerald">{job.regime || '—'}</span></td>
                      <td><span className={`badge ${job.active ? 'badge-emerald' : 'badge-muted'}`}>{job.active ? 'Ativa' : 'Inativa'}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-icon btn-sm" onClick={() => { setEditingJobId(job.id); setJobForm({ title: job.title, area: job.area || '', regime: job.regime || 'CLT', location: job.location || '', hours: job.hours || '', requirements: job.requirements || '', responsibilities: job.responsibilities || '', benefits: job.benefits || '', expiresAt: job.expiresAt ? job.expiresAt.substring(0, 10) : '' }) }}><Edit size={14} /></button>
                          <button className="btn btn-icon btn-sm" onClick={async () => { if(confirm('Desativar vaga?')) await deleteJob.mutateAsync(job.id) }}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {jobOpenings.length === 0 && !editingJobId && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 'var(--space-4)' }}>Nenhuma vaga cadastrada.</p>
              )}
            </div>
          )}
          {activeTab === 'banners' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Banners do Hero Slider</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingBannerId('new'); setBannerForm({ title: '', subtitle: '', imageUrl: '', ctaLabel: '', ctaUrl: '', order: bannersData.length, active: true }) }}>
                  <Plus size={14} /> Novo Banner
                </button>
              </div>

              {editingBannerId && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-subtle)' }}>
                  <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 14 }}>{editingBannerId === 'new' ? 'Criar Banner' : 'Editar Banner'}</h4>
                  <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="input-group">
                      <label className="input-label">Título <span className="required">*</span></label>
                      <input className="input-field" value={bannerForm.title} onChange={e => setBannerForm({ ...bannerForm, title: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Subtítulo</label>
                      <input className="input-field" value={bannerForm.subtitle} onChange={e => setBannerForm({ ...bannerForm, subtitle: e.target.value })} />
                    </div>
                    <div className="input-group full-span">
                      <label className="input-label">Imagem do Banner <span className="required">*</span></label>
                      <input
                        ref={bannerImageRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setBannerUploading(true)
                          try {
                            const result = await uploadFile(file, 'banners')
                            setBannerForm(prev => ({ ...prev, imageUrl: result.fileUrl }))
                          } catch { /* ignore */ }
                          setBannerUploading(false)
                          if (bannerImageRef.current) bannerImageRef.current.value = ''
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                        <input className="input-field" style={{ flex: 1 }} placeholder="https://... ou linear-gradient(...)" value={bannerForm.imageUrl} onChange={e => setBannerForm({ ...bannerForm, imageUrl: e.target.value })} />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ whiteSpace: 'nowrap' }}
                          onClick={() => bannerImageRef.current?.click()}
                          disabled={bannerUploading}
                        >
                          <Camera size={14} /> {bannerUploading ? 'Enviando...' : 'Upload'}
                        </button>
                      </div>
                      {bannerForm.imageUrl && !bannerForm.imageUrl.startsWith('linear') && (
                        <div style={{ marginTop: 8, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border-default)', maxWidth: 320 }}>
                          <img src={bannerForm.imageUrl} alt="Preview" style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                    <div className="input-group">
                      <label className="input-label">Rótulo do Botão (CTA)</label>
                      <input className="input-field" placeholder="Ex: Agendar Agora" value={bannerForm.ctaLabel} onChange={e => setBannerForm({ ...bannerForm, ctaLabel: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Link do Botão (CTA)</label>
                      <input className="input-field" placeholder="Ex: /agendar" value={bannerForm.ctaUrl} onChange={e => setBannerForm({ ...bannerForm, ctaUrl: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Ordem de exibição</label>
                      <input className="input-field" type="number" value={bannerForm.order} onChange={e => setBannerForm({ ...bannerForm, order: parseInt(e.target.value) })} />
                    </div>
                    <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 12, height: '100%' }}>
                        <input type="checkbox" checked={bannerForm.active} onChange={e => setBannerForm({ ...bannerForm, active: e.target.checked })} />
                        <label className="input-label" style={{ marginBottom: 0 }}>Banner Ativo</label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingBannerId(null)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveBanner} disabled={createBanner.isPending || updateBanner.isPending}>Salvar</button>
                  </div>
                </div>
              )}

              <div className="data-list">
                {bannersData.sort((a, b) => a.order - b.order).map(banner => (
                  <div key={banner.id} className="data-list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 60, height: 40, borderRadius: 4, background: banner.imageUrl?.startsWith('linear') ? banner.imageUrl : `url(${banner.imageUrl}) center/cover`, border: '1px solid var(--color-border-subtle)' }} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{banner.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Ordem: {banner.order} · {banner.active ? 'Ativo' : 'Inativo'}</div>
                      </div>
                    </div>
                    <div className="row-actions">
                      <button className="btn btn-icon btn-sm" onClick={() => { setEditingBannerId(banner.id); setBannerForm({ title: banner.title, subtitle: banner.subtitle || '', imageUrl: banner.imageUrl || '', ctaLabel: banner.ctaLabel || '', ctaUrl: banner.ctaUrl || '', order: banner.order, active: banner.active }) }}><Edit size={14} /></button>
                      <button className="btn btn-icon btn-sm" onClick={async () => { if(confirm('Remover banner?')) await deleteBanner.mutateAsync(banner.id) }}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
                    </div>
                  </div>
                ))}
                {bannersData.length === 0 && !editingBannerId && (
                  <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>Nenhum banner cadastrado.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
