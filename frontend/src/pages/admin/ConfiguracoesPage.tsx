import { useState, useEffect, useRef } from 'react'
import { Building2, Bell, FileText, Puzzle, Users, Shield, DoorOpen, MessageSquare, Plus, Edit, Trash2, Lock, Hash, Info, Briefcase, Camera, Wrench, AlertTriangle, Palette, RotateCcw, Loader2, Save, RefreshCw, Tag } from 'lucide-react'
import IntegrationsPanel from './IntegrationsPanel'
import { useClinics, useUpdateClinic } from '../../hooks/useClinics'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, type CategoryType } from '../../hooks/useCategories'
import { useMessageTemplates, useUpsertMessageTemplate, TEMPLATE_LABELS, type MessageTemplate, type TemplateKind } from '../../hooks/useMessageTemplates'
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
  { id: 'categories', label: 'Categorias', icon: Tag },
  { id: 'rooms', label: 'Salas', icon: DoorOpen },
  { id: 'equipment', label: 'Equipamentos', icon: Wrench },
  { id: 'chat', label: 'Chat Interno', icon: MessageSquare },
  { id: 'about', label: 'Sobre', icon: Info },
  { id: 'jobs', label: 'Vagas', icon: Briefcase },
  { id: 'banners', label: 'Banners', icon: Camera },
  { id: 'design', label: 'Design', icon: Palette },
]

const DEFAULT_THEME: Record<string, { label: string; value: string; group: string }> = {
  '--color-bg-primary':      { label: 'Fundo Principal',      value: '#F5F0E8', group: 'Fundos' },
  '--color-bg-secondary':    { label: 'Fundo Secundario',     value: '#EDE8DF', group: 'Fundos' },
  '--color-bg-dark':         { label: 'Sidebar / Menu',       value: '#1A1A1A', group: 'Fundos' },
  '--color-text-primary':    { label: 'Texto Principal',      value: '#1A1A1A', group: 'Texto' },
  '--color-text-secondary':  { label: 'Texto Secundario',     value: '#4A4A4A', group: 'Texto' },
  '--color-text-muted':      { label: 'Texto Discreto',       value: '#9A9590', group: 'Texto' },
  '--color-accent-gold':     { label: 'Dourado (Destaques)',   value: '#C9A84C', group: 'Acentos' },
  '--color-accent-emerald':  { label: 'Verde (Botoes)',        value: '#2D6A4F', group: 'Acentos' },
  '--color-accent-brand':    { label: 'Cor da Marca',          value: '#2D6A4F', group: 'Acentos' },
  '--color-accent-danger':   { label: 'Vermelho (Erros)',      value: '#8B2020', group: 'Acentos' },
  '--color-accent-warning':  { label: 'Laranja (Avisos)',      value: '#A0622A', group: 'Acentos' },
  '--color-border-default':  { label: 'Borda Padrao',          value: '#D4CFC6', group: 'Bordas' },
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('clinic')
  const { data: clinics = [] } = useClinics()
  const updateClinicMutation = useUpdateClinic()
  const clinic = clinics[0]

  const [clinicForm, setClinicForm] = useState({ name: '', cnpj: '', address: '', phone: '', email: '', whatsapp: '', facebook: '' })
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [])

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
  const [aboutForm, setAboutForm] = useState({ name: '', description: '', mission: '', vision: '', values: '', milestones: [] as { year: string; title: string; description: string }[], galleryUrls: [] as string[] })
  const [aboutSaveMsg, setAboutSaveMsg] = useState('')
  const [newMilestone, setNewMilestone] = useState({ year: '', title: '', description: '' })

  // ─── Confirmação de exclusão genérica ───────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{ label: string; action: () => Promise<void> } | null>(null)
  const [deleteConfirmError, setDeleteConfirmError] = useState('')
  const [deleteConfirmPending, setDeleteConfirmPending] = useState(false)

  const askDelete = (label: string, action: () => Promise<void>) => {
    setDeleteConfirmError('')
    setDeleteConfirm({ label, action })
  }
  const runDelete = async () => {
    if (!deleteConfirm) return
    setDeleteConfirmPending(true)
    try {
      await deleteConfirm.action()
      setDeleteConfirm(null)
    } catch (err: any) {
      setDeleteConfirmError(err?.response?.data?.message || 'Erro ao excluir. Tente novamente.')
    } finally {
      setDeleteConfirmPending(false)
    }
  }

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

  // Design (Theme) State
  const [themeForm, setThemeForm] = useState<Record<string, string>>({})
  const [designSaveMsg, setDesignSaveMsg] = useState('')

  // Users State
  const { data: systemUsers = [] } = useSystemUsers(clinic?.id)
  const createSystemUser = useCreateSystemUser()
  const updateSystemUser = useUpdateSystemUser()
  const deleteSystemUser = useDeleteSystemUser()
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', role: 'RECEPTIONIST', active: true, permissions: {} as Record<string, boolean> })
  // Bloco separado para troca de senha (admin pode alterar a senha de
  // qualquer usuário interno). Vazio = não alterar.
  const [userPassword, setUserPassword] = useState('')
  const [userPasswordConfirm, setUserPasswordConfirm] = useState('')
  const [userPasswordError, setUserPasswordError] = useState('')
  const [userSaveMsg, setUserSaveMsg] = useState('')

  useEffect(() => {
    if (clinic) {
      setClinicForm({
        name: clinic.name || '',
        cnpj: clinic.cnpj || '',
        address: clinic.address || '',
        phone: clinic.phone || '',
        email: clinic.email || '',
        whatsapp: clinic.whatsapp || '',
        facebook: clinic.facebook || '',
      })
      setAboutForm({
        name: clinic.name || '',
        description: clinic.description || '',
        mission: (clinic as any).mission || '',
        vision: (clinic as any).vision || '',
        values: (clinic as any).values || '',
        milestones: (clinic as any).milestones || [],
        galleryUrls: (clinic as any).galleryUrls || [],
      })
      if (clinic.logoUrl) setLogoPreview(clinic.logoUrl)

      // Initialize theme form with saved colors or defaults
      const saved = clinic.themeColors || {}
      const initial: Record<string, string> = {}
      for (const [varName, def] of Object.entries(DEFAULT_THEME)) {
        initial[varName] = saved[varName] || def.value
      }
      setThemeForm(initial)
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
      await updateClinicMutation.mutateAsync({ id: clinic.id, name: aboutForm.name, description: aboutForm.description, mission: aboutForm.mission, vision: aboutForm.vision, values: aboutForm.values, milestones: aboutForm.milestones, galleryUrls: aboutForm.galleryUrls })
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
    setUserSaveMsg('')
    setUserPasswordError('')

    // Validação de senha (compartilhada entre criação e edição).
    const wantsPasswordChange = !!userPassword.trim()
    if (wantsPasswordChange) {
      if (userPassword.trim().length < 6) {
        setUserPasswordError('A senha deve ter ao menos 6 caracteres.')
        return
      }
      if (userPassword !== userPasswordConfirm) {
        setUserPasswordError('As senhas não coincidem.')
        return
      }
    }

    if (editingUserId === 'new') {
      const created = await createSystemUser.mutateAsync({
        clinicId: clinic.id,
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone || undefined,
        role: userForm.role,
        permissions: userForm.permissions,
        password: wantsPasswordChange ? userPassword.trim() : undefined,
      })
      setUserSaveMsg(created.generatedPassword
        ? `Usuário criado. Senha padrão: ${created.generatedPassword}`
        : 'Usuário criado com sucesso.')
    } else if (editingUserId) {
      // Update agora envia também nome, e-mail, telefone e senha (se houver).
      await updateSystemUser.mutateAsync({
        id: editingUserId,
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone || undefined,
        role: userForm.role,
        active: userForm.active,
        permissions: userForm.permissions,
        password: wantsPasswordChange ? userPassword.trim() : undefined,
      })
      setUserSaveMsg(wantsPasswordChange
        ? 'Usuário atualizado e senha redefinida.'
        : 'Usuário atualizado com sucesso.')
    }
    setUserPassword('')
    setUserPasswordConfirm('')
    setEditingUserId(null)
  }

  return (
    <div className="animate-fade-in">
      {/* ── Modal de confirmação de exclusão ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: 400, width: '90%', padding: 'var(--space-8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-4)' }}>
              <AlertTriangle size={22} color="var(--color-accent-danger)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', margin: 0 }}>Confirmar exclusão</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 'var(--space-4)' }}>
              {deleteConfirm.label}
              <br /><br />Esta ação não pode ser desfeita.
            </p>
            {deleteConfirmError && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', fontSize: 13, color: 'var(--color-accent-danger)', marginBottom: 'var(--space-4)' }}>
                {deleteConfirmError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => { setDeleteConfirm(null); setDeleteConfirmError('') }}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: 'var(--color-accent-danger)' }} onClick={runDelete} disabled={deleteConfirmPending}>
                {deleteConfirmPending ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <label className="input-label">
                    WhatsApp
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6 }}>· botão do site</span>
                  </label>
                  <input
                    className="input-field"
                    type="tel"
                    placeholder="+55 11 99999-9999"
                    value={clinicForm.whatsapp}
                    onChange={e => setClinicForm({ ...clinicForm, whatsapp: e.target.value })}
                  />
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>
                    Formato recomendado: +5511999999999 (sem espaços ou traços)
                  </span>
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

          {activeTab === 'templates' && <TemplatesSection />}

          {activeTab === 'integrations' && (
            <IntegrationsPanel clinicId={clinic?.id} />
          )}

          {activeTab === 'users' && (
            <div>
              <div className="admin-responsive-header" style={{ marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Usuários do Sistema</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingUserId('new'); setUserForm({ name: '', email: '', phone: '', role: 'RECEPTIONIST', active: true, permissions: {} }); setUserPassword(''); setUserPasswordConfirm(''); setUserPasswordError('') }}>
                  <Plus size={14} /> Novo Usuário
                </button>
              </div>

              {editingUserId && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-subtle)' }}>
                  <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 14 }}>{editingUserId === 'new' ? 'Adicionar Usuário' : 'Editar Usuário'}</h4>
                  <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
                    {/* Nome / E-mail / Telefone agora ficam visíveis também
                        no modo edição — admin pode alterar qualquer dado
                        cadastral do usuário interno. */}
                    <div className="input-group">
                      <label className="input-label">Nome Completo</label>
                      <input className="input-field" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">E-mail (Login)</label>
                      <input className="input-field" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Telefone</label>
                      <input className="input-field" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Perfil de Acesso</label>
                      <select className="input-field" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                        <option value="RECEPTIONIST">Atendimento / Recepcionista</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>
                    {editingUserId !== 'new' && (
                      <div className="input-group full-span" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input type="checkbox" checked={userForm.active} onChange={e => setUserForm({ ...userForm, active: e.target.checked })} />
                        <label className="input-label" style={{ marginBottom: 0 }}>Usuário Ativo (Pode acessar o sistema)</label>
                      </div>
                    )}
                  </div>

                  {/* Bloco de senha — admin pode definir/redefinir a senha
                      do usuário interno. Em "Editar", deixar em branco mantém
                      a senha atual. */}
                  <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', borderRadius: 8, border: '1px dashed var(--color-border-default)' }}>
                    <label className="input-label" style={{ marginBottom: 'var(--space-3)' }}>
                      {editingUserId === 'new' ? 'Senha (opcional)' : 'Alterar senha (opcional)'}
                    </label>
                    <div className="form-2col">
                      <div className="input-group">
                        <label className="input-label">Nova senha</label>
                        <input
                          className="input-field"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Mínimo 6 caracteres"
                          value={userPassword}
                          onChange={e => setUserPassword(e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Confirmar senha</label>
                        <input
                          className="input-field"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Repita a senha"
                          value={userPasswordConfirm}
                          onChange={e => setUserPasswordConfirm(e.target.value)}
                        />
                      </div>
                    </div>
                    {userPasswordError && (
                      <p style={{ color: 'var(--color-accent-danger)', fontSize: 12, marginTop: 6 }}>{userPasswordError}</p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                      {editingUserId === 'new'
                        ? 'Se vazio, a senha padrão "123456" será definida.'
                        : 'Deixe em branco para manter a senha atual.'}
                    </p>
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
                  {editingUserId === 'new' && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>A senha padrão será as 4 primeiras letras do nome + <code>123!</code>.</p>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingUserId(null)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveUser} disabled={createSystemUser.isPending || updateSystemUser.isPending}>Salvar</button>
                  </div>
                  {userSaveMsg && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-accent-emerald)' }}>{userSaveMsg}</p>}
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
                          {su.role === 'ADMIN' ? 'Administrador' : su.role === 'RECEPTIONIST' ? 'Recepção' : su.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${su.active ? 'badge-emerald' : 'badge-muted'}`}>
                          {su.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-icon btn-sm" onClick={() => { setEditingUserId(su.id); setUserForm({ name: su.user.name, email: su.user.email, phone: su.user.phone || '', role: su.role, active: su.active, permissions: (su.permissions as Record<string, boolean>) || {} }); setUserPassword(''); setUserPasswordConfirm(''); setUserPasswordError('') }}><Edit size={14} /></button>
                          <button className="btn btn-icon btn-sm" onClick={() => askDelete(`Remover acesso do usuário "${su.user?.name || su.id}"?`, () => deleteSystemUser.mutateAsync(su.id))}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
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
                    <button className="btn btn-icon btn-sm" onClick={() => askDelete(`Remover o convênio "${ins.name}"?`, () => deleteInsurance.mutateAsync(ins.id))}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
                  </div>
                </div>
              ))}
              {insurances.length === 0 && !editingInsuranceId && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Nenhum convênio cadastrado.</p>
              )}
            </div>
          )}

          {activeTab === 'categories' && <CategoriesSection askDelete={askDelete} />}

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
                    <button className="btn btn-icon btn-sm" onClick={() => askDelete(`Remover a sala "${r.name}"?`, () => deleteRoom.mutateAsync(r.id))}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
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
                    <button className="btn btn-icon btn-sm" onClick={() => askDelete(`Remover o equipamento "${eq.name}"?`, () => deleteEquipment.mutateAsync(eq.id))}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
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
                    <button className="btn btn-icon btn-sm" onClick={() => askDelete(`Remover o canal "${ch.name}"?`, () => deleteChannel.mutateAsync(ch.id))}><Trash2 size={14} color="var(--color-accent-warning)" /></button>
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
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-2)' }}>Pagina Sobre</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                Configure os textos e imagens exibidos na pagina <strong>/sobre</strong> do site publico.
              </p>

              {/* ---- Apresentacao ---- */}
              <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-primary)' }}>
                <h4 style={{ fontSize: 'var(--text-ui)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Building2 size={16} color="var(--color-accent-emerald)" />
                  Apresentacao
                </h4>
                <div className="form-2col">
                  <div className="input-group full-span">
                    <label className="input-label">Titulo <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(exibido como "Sobre a [titulo]")</span></label>
                    <input className="input-field" value={aboutForm.name} onChange={e => setAboutForm({ ...aboutForm, name: e.target.value })} placeholder="Ex: Clinica Saude & Bem-Estar" />
                  </div>
                  <div className="input-group full-span">
                    <label className="input-label">Descricao</label>
                    <textarea className="input-field" style={{ minHeight: 90 }} value={aboutForm.description} onChange={e => setAboutForm({ ...aboutForm, description: e.target.value })} placeholder="Clinica multidisciplinar focada em saude integral e qualidade de vida." />
                  </div>
                </div>
              </div>

              {/* ---- Missao, Visao e Valores ---- */}
              <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-primary)' }}>
                <h4 style={{ fontSize: 'var(--text-ui)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Shield size={16} color="var(--color-accent-gold)" />
                  Missao, Visao e Valores
                </h4>
                <div className="admin-grid-2" style={{ gap: 'var(--space-5)' }}>
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Missao</label>
                    <textarea className="input-field" style={{ minHeight: 90 }} value={aboutForm.mission} onChange={e => setAboutForm({ ...aboutForm, mission: e.target.value })} placeholder="Proporcionar saude e bem-estar com atendimento humanizado..." />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Visao</label>
                    <textarea className="input-field" style={{ minHeight: 90 }} value={aboutForm.vision} onChange={e => setAboutForm({ ...aboutForm, vision: e.target.value })} placeholder="Ser referencia nacional em excelencia medica..." />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Valores</label>
                    <textarea className="input-field" style={{ minHeight: 90 }} value={aboutForm.values} onChange={e => setAboutForm({ ...aboutForm, values: e.target.value })} placeholder="Etica, empatia, excelencia, inovacao continua..." />
                  </div>
                </div>
              </div>

              {/* ---- Marcos na Trajetoria ---- */}
              <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-primary)' }}>
                <h4 style={{ fontSize: 'var(--text-ui)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Hash size={16} color="var(--color-accent-emerald)" />
                  Marcos na Trajetoria
                </h4>

                {aboutForm.milestones.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-5)' }}>
                    {aboutForm.milestones.map((m, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: i < aboutForm.milestones.length - 1 ? '1px solid var(--color-border-default)' : 'none',
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontSize: 'var(--text-ui)',
                          fontWeight: 'var(--weight-bold)', color: 'var(--color-accent-gold)',
                          minWidth: 52, textAlign: 'center',
                        }}>{m.year}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-body)', color: 'var(--color-text-primary)' }}>{m.title}</div>
                          {m.description && (
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 2 }}>{m.description}</div>
                          )}
                        </div>
                        <button className="btn btn-icon btn-sm" onClick={() => handleRemoveMilestone(i)} title="Remover marco">
                          <Trash2 size={14} color="var(--color-accent-danger)" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{
                  padding: 'var(--space-4)', background: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border-default)',
                }}>
                  <div className="admin-grid-2 admin-milestone-grid" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <div className="input-group">
                      <label className="input-label">Ano</label>
                      <input className="input-field" placeholder="2004" value={newMilestone.year} onChange={e => setNewMilestone({ ...newMilestone, year: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Titulo</label>
                      <input className="input-field" placeholder="Ex: Fundacao da clinica" value={newMilestone.title} onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })} />
                    </div>
                  </div>
                  <div className="input-group" style={{ marginBottom: 'var(--space-3)' }}>
                    <label className="input-label">Descricao <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
                    <input className="input-field" placeholder="Breve descricao do marco" value={newMilestone.description} onChange={e => setNewMilestone({ ...newMilestone, description: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleAddMilestone} disabled={!newMilestone.year || !newMilestone.title}>
                      <Plus size={14} /> Adicionar Marco
                    </button>
                  </div>
                </div>

                {aboutForm.milestones.length === 0 && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)', textAlign: 'center' }}>
                    Nenhum marco cadastrado. Adicione marcos importantes na trajetoria da clinica.
                  </p>
                )}
              </div>

              {/* ---- Galeria de Imagens ---- */}
              <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-primary)' }}>
                <div className="admin-responsive-header" style={{ marginBottom: 'var(--space-5)' }}>
                  <h4 style={{ fontSize: 'var(--text-ui)', fontWeight: 'var(--weight-medium)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 0 }}>
                    <Camera size={16} color="var(--color-accent-gold)" />
                    Galeria de Imagens
                  </h4>
                  <button className="btn btn-secondary btn-sm" onClick={() => galleryInputRef.current?.click()} disabled={uploading}>
                    <Plus size={14} /> {uploading ? 'Enviando...' : 'Adicionar'}
                  </button>
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleGalleryUpload}
                />
                {aboutForm.galleryUrls.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
                    {aboutForm.galleryUrls.map((url, i) => (
                      <div key={i} style={{
                        position: 'relative', aspectRatio: '4/3', borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden', border: '1px solid var(--color-border-default)',
                        boxShadow: 'var(--shadow-card)', transition: 'transform var(--transition-fast)',
                      }}>
                        <img src={url} alt={`Galeria ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)',
                          opacity: 0, transition: 'opacity var(--transition-fast)',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                        >
                          <button
                            className="btn btn-icon btn-sm"
                            style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(139,32,32,0.85)', borderRadius: 'var(--radius-full)' }}
                            onClick={() => setAboutForm({ ...aboutForm, galleryUrls: aboutForm.galleryUrls.filter((_, j) => j !== i) })}
                          >
                            <Trash2 size={13} color="white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="file-upload-area"
                    style={{ padding: 'var(--space-8)', cursor: 'pointer' }}
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <Camera size={28} />
                    <p style={{ margin: '8px 0 4px' }}>Arraste imagens ou clique para selecionar</p>
                    <span>JPG, PNG ou WebP</span>
                  </div>
                )}
              </div>

              {/* ---- Botao Salvar ---- */}
              {aboutSaveMsg && (
                <div style={{
                  marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  background: aboutSaveMsg.includes('Erro') ? 'rgba(139,32,32,0.08)' : 'rgba(45,106,79,0.08)',
                  color: aboutSaveMsg.includes('Erro') ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)',
                  fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)',
                }}>
                  {aboutSaveMsg}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSaveAbout} disabled={updateClinicMutation.isPending}>
                  {updateClinicMutation.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
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
                          <button className="btn btn-icon btn-sm" onClick={() => askDelete(`Excluir a vaga "${job.title}"?`, () => deleteJob.mutateAsync(job.id))}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
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
                      <button className="btn btn-icon btn-sm" onClick={() => askDelete(`Remover o banner "${banner.title}"?`, () => deleteBanner.mutateAsync(banner.id))}><Trash2 size={14} color="var(--color-accent-danger)" /></button>
                    </div>
                  </div>
                ))}
                {bannersData.length === 0 && !editingBannerId && (
                  <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>Nenhum banner cadastrado.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === 'design' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Cores do Sistema</h3>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Personalize as cores de todo o site e painel. As alteracoes sao aplicadas em tempo real.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const defaults: Record<string, string> = {}
                    for (const [varName, def] of Object.entries(DEFAULT_THEME)) {
                      defaults[varName] = def.value
                      document.documentElement.style.setProperty(varName, def.value)
                    }
                    setThemeForm(defaults)
                  }}
                >
                  <RotateCcw size={14} /> Restaurar Padrao
                </button>
              </div>

              {(() => {
                const groups = new Map<string, [string, { label: string; value: string }][]>()
                for (const [varName, def] of Object.entries(DEFAULT_THEME)) {
                  const g = groups.get(def.group) || []
                  g.push([varName, def])
                  groups.set(def.group, g)
                }

                return Array.from(groups.entries()).map(([groupName, items]) => (
                  <div key={groupName} className="card" style={{ marginBottom: 'var(--space-4)' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>{groupName}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
                      {items.map(([varName, def]) => (
                        <div key={varName} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="color"
                              value={themeForm[varName] || def.value}
                              onChange={e => {
                                const newVal = e.target.value
                                setThemeForm(prev => ({ ...prev, [varName]: newVal }))
                                // Live preview
                                document.documentElement.style.setProperty(varName, newVal)
                                // Handle gold opacity derivatives
                                if (varName === '--color-accent-gold') {
                                  const r = parseInt(newVal.slice(1, 3), 16)
                                  const g = parseInt(newVal.slice(3, 5), 16)
                                  const b = parseInt(newVal.slice(5, 7), 16)
                                  document.documentElement.style.setProperty('--color-accent-gold-40', `rgba(${r},${g},${b},0.4)`)
                                  document.documentElement.style.setProperty('--color-accent-gold-60', `rgba(${r},${g},${b},0.6)`)
                                  document.documentElement.style.setProperty('--color-border-accent', `rgba(${r},${g},${b},0.6)`)
                                }
                              }}
                              style={{ width: 40, height: 40, border: '2px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 0 }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{def.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {themeForm[varName] || def.value}
                            </div>
                          </div>
                          {themeForm[varName] !== def.value && (
                            <button
                              className="btn btn-icon btn-sm"
                              title="Restaurar padrao"
                              onClick={() => {
                                setThemeForm(prev => ({ ...prev, [varName]: def.value }))
                                document.documentElement.style.setProperty(varName, def.value)
                              }}
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}

              {/* Preview */}
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 'var(--space-4)' }}>Pre-visualizacao</h4>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="btn btn-primary btn-sm">Botao Primario</button>
                  <button className="btn btn-secondary btn-sm">Botao Secundario</button>
                  <span className="badge badge-emerald">Ativo</span>
                  <span className="badge badge-gold">Destaque</span>
                  <span className="badge badge-danger">Erro</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Texto discreto</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Texto secundario</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Texto principal</span>
                </div>
              </div>

              {designSaveMsg && (
                <div style={{ color: designSaveMsg.includes('Erro') ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)', fontSize: 13, marginBottom: 'var(--space-4)' }}>
                  {designSaveMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!clinic) return
                    setDesignSaveMsg('')
                    try {
                      // Only save colors that differ from defaults
                      const toSave: Record<string, string> = {}
                      for (const [varName, val] of Object.entries(themeForm)) {
                        if (val !== DEFAULT_THEME[varName]?.value) {
                          toSave[varName] = val
                        }
                      }
                      await updateClinicMutation.mutateAsync({ id: clinic.id, themeColors: Object.keys(toSave).length > 0 ? toSave : {} })
                      setDesignSaveMsg('Cores salvas com sucesso!')
                      setTimeout(() => setDesignSaveMsg(''), 3000)
                    } catch {
                      setDesignSaveMsg('Erro ao salvar cores.')
                    }
                  }}
                  disabled={updateClinicMutation.isPending}
                >
                  {updateClinicMutation.isPending ? 'Salvando...' : 'Salvar Cores'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Templates de Mensagem ────────────────────────────────────────────────────
function TemplatesSection() {
  const { data: templates, isLoading, error, refetch } = useMessageTemplates()
  const upsert = useUpsertMessageTemplate()

  // Local edits per kind. Initialised lazily from server data; users see
  // unsaved-state visually via the `dirty` flag.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<{ kind: TemplateKind; type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (templates) {
      // Sync drafts: keep user-edited values; otherwise mirror the server.
      setDrafts(prev => {
        const next: Record<string, string> = {}
        templates.forEach(t => {
          next[t.kind] = prev[t.kind] !== undefined ? prev[t.kind] : t.body
        })
        return next
      })
    }
  }, [templates])

  const handleSave = async (template: MessageTemplate) => {
    setFeedback(null)
    try {
      await upsert.mutateAsync({ kind: template.kind, body: drafts[template.kind] ?? template.body })
      setFeedback({ kind: template.kind, type: 'success', msg: 'Template salvo.' })
      setTimeout(() => setFeedback(null), 2500)
    } catch (err: any) {
      setFeedback({ kind: template.kind, type: 'error', msg: err?.response?.data?.message ?? 'Falha ao salvar.' })
    }
  }

  const handleReset = (template: MessageTemplate) => {
    setDrafts(prev => ({ ...prev, [template.kind]: template.body }))
    setFeedback(null)
  }

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 size={20} className="animate-spin" color="var(--color-text-muted)" />
      </div>
    )
  }

  if (error || !templates) {
    return (
      <div style={{ padding: 16, color: 'var(--color-accent-danger, #dc2626)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={16} /> Falha ao carregar templates.
        <button className="btn btn-secondary btn-sm" onClick={() => refetch()}>Tentar novamente</button>
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', marginBottom: 'var(--space-2)' }}>
        Templates de Mensagem
      </h3>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
        Os textos abaixo são usados nas mensagens automáticas e em envios manuais.
        As variáveis entre chaves são substituídas pelos dados do paciente e do agendamento.
      </p>

      {templates.map(t => {
        const draft = drafts[t.kind] ?? t.body
        const dirty = draft !== t.body
        const fb = feedback?.kind === t.kind ? feedback : null
        return (
          <div key={t.kind} style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
                {TEMPLATE_LABELS[t.kind]}
                {t.isDefault && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                    padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(99,102,241,0.10)', color: '#4338ca',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }}>
                    Padrão
                  </span>
                )}
                {dirty && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                    padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(234,179,8,0.12)', color: '#b45309',
                    border: '1px solid rgba(234,179,8,0.35)',
                  }}>
                    Não salvo
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {dirty && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleReset(t)}
                    disabled={upsert.isPending}
                    type="button"
                  >
                    <RotateCcw size={13} /> Desfazer
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleSave(t)}
                  disabled={!dirty || upsert.isPending}
                  type="button"
                >
                  {upsert.isPending && fb?.kind === t.kind
                    ? <><Loader2 size={13} className="animate-spin" /> Salvando...</>
                    : <><Save size={13} /> Salvar</>}
                </button>
              </div>
            </div>

            <textarea
              className="input-field"
              value={draft}
              onChange={e => setDrafts(prev => ({ ...prev, [t.kind]: e.target.value }))}
              style={{ minHeight: 90, fontFamily: 'var(--font-mono, monospace)', fontSize: 13 }}
            />

            <p className="input-hint" style={{ marginTop: 4 }}>
              Variáveis: {t.variables.map(v => `{${v}}`).join(', ')}
            </p>

            {fb && (
              <p style={{
                fontSize: 12,
                marginTop: 4,
                color: fb.type === 'success' ? 'var(--color-accent-emerald, #16a34a)' : 'var(--color-accent-danger, #dc2626)',
              }}>
                {fb.msg}
              </p>
            )}
          </div>
        )
      })}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => refetch()} type="button">
          <RefreshCw size={13} /> Recarregar do servidor
        </button>
      </div>
    </div>
  )
}

// ── Categorias Dinâmicas (Usuário, Profissional, Especialidades) ─────────────
const CATEGORY_TYPE_TABS: { id: CategoryType; label: string; helpText: string }[] = [
  { id: 'USER',         label: 'Usuário',     helpText: 'Categorias para usuários do sistema (ex.: Médico, Recepção, Financeiro).' },
  { id: 'PROFESSIONAL', label: 'Profissional', helpText: 'Tipos de profissional atendentes (ex.: Psicólogo, Dentista, Cirurgião).' },
  { id: 'SPECIALTY',    label: 'Especialidades', helpText: 'Especialidades, podendo ser vinculadas a uma categoria profissional.' },
]

function CategoriesSection({ askDelete }: { askDelete: (label: string, action: () => Promise<void>) => void }) {
  const [activeType, setActiveType] = useState<CategoryType>('USER')
  const { data: categories = [], isLoading } = useCategories({ type: activeType })
  const { data: professionalCategories = [] } = useCategories({ type: 'PROFESSIONAL' })
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: string; description: string; parentId: string }>({
    name: '', description: '', parentId: '',
  })
  const [errorMsg, setErrorMsg] = useState('')

  const openNew = () => {
    setEditingId('new')
    setForm({ name: '', description: '', parentId: '' })
    setErrorMsg('')
  }

  const openEdit = (cat: typeof categories[0]) => {
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      description: cat.description || '',
      parentId: cat.parentId || '',
    })
    setErrorMsg('')
  }

  const handleSave = async () => {
    setErrorMsg('')
    const trimmed = form.name.trim()
    if (!trimmed) { setErrorMsg('Nome é obrigatório.'); return }
    try {
      if (editingId === 'new') {
        await createMutation.mutateAsync({
          type: activeType,
          name: trimmed,
          description: form.description || undefined,
          parentId: activeType === 'SPECIALTY' && form.parentId ? form.parentId : null,
        })
      } else if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          name: trimmed,
          description: form.description,
          parentId: activeType === 'SPECIALTY' ? (form.parentId || null) : undefined,
        })
      }
      setEditingId(null)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Erro ao salvar categoria.')
    }
  }

  const activeMeta = CATEGORY_TYPE_TABS.find(t => t.id === activeType)!

  return (
    <div>
      <div className="admin-responsive-header" style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>Categorias</h3>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <Plus size={14} /> Nova categoria
        </button>
      </div>

      <div className="pill-tabs" style={{ marginBottom: 'var(--space-4)' }}>
        {CATEGORY_TYPE_TABS.map(t => (
          <button
            key={t.id}
            className={`pill-tab${activeType === t.id ? ' active' : ''}`}
            onClick={() => { setActiveType(t.id); setEditingId(null); setErrorMsg('') }}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        {activeMeta.helpText}
      </p>

      {editingId && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-subtle)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 14 }}>
            {editingId === 'new' ? 'Adicionar categoria' : 'Editar categoria'}
          </h4>
          <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-label">Nome <span className="required">*</span></label>
              <input
                className="input-field"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={activeType === 'PROFESSIONAL' ? 'Ex.: Psicólogo' : activeType === 'SPECIALTY' ? 'Ex.: Neuropsicologia' : 'Ex.: Recepção'}
              />
            </div>
            {activeType === 'SPECIALTY' && (
              <div className="input-group">
                <label className="input-label">Categoria profissional (opcional)</label>
                <select
                  className="input-field"
                  value={form.parentId}
                  onChange={e => setForm({ ...form, parentId: e.target.value })}
                >
                  <option value="">— Sem vínculo —</option>
                  {professionalCategories.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="input-group full-span">
              <label className="input-label">Descrição</label>
              <input
                className="input-field"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          {errorMsg && (
            <p style={{ fontSize: 13, color: 'var(--color-accent-danger)', marginBottom: 'var(--space-3)' }}>{errorMsg}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Carregando...</p>
      ) : categories.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Nenhuma categoria cadastrada.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              {activeType === 'SPECIALTY' && <th>Categoria profissional</th>}
              <th>Descrição</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={{ fontWeight: 500 }}>{cat.name}</td>
                {activeType === 'SPECIALTY' && (
                  <td>{cat.parentName || <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>}</td>
                )}
                <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                  {cat.description || '—'}
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-icon btn-sm" onClick={() => openEdit(cat)}>
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn-icon btn-sm"
                      onClick={() => askDelete(`Remover a categoria "${cat.name}"?`, () => deleteMutation.mutateAsync(cat.id))}
                    >
                      <Trash2 size={14} color="var(--color-accent-danger)" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
