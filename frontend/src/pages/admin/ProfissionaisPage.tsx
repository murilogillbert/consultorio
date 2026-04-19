import { useState, useRef, Fragment } from 'react'
import { Search, Plus, Edit, Power, Camera, X } from 'lucide-react'
import { useProfessionals, useCreateProfessional, useUpdateProfessional } from '../../hooks/useProfessionals'
import { api } from '../../services/api'
import { useUpload } from '../../hooks/useUpload'
import { useRooms } from '../../hooks/useRooms'
import { useInsurances } from '../../hooks/useInsurances'
import ComboBox from '../../components/ComboBox'

const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const times = ['07:00', '08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

export default function ProfissionaisPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [scheduleSlots, setScheduleSlots] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    crm: '',
    councilType: 'CRM',
    specialty: '',
    bio: '',
    languages: '',
    userId: '',
    roomId: '',
    insuranceIds: [] as string[],
    commissionPct: '50'
  })
  const [formError, setFormError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, uploading } = useUpload()

  const { data: professionals = [], isLoading } = useProfessionals()
  const { data: rooms = [] } = useRooms()
  const { data: insurancePlans = [] } = useInsurances()
  const createMutation = useCreateProfessional()
  const updateMutation = useUpdateProfessional()

  const toggleSlot = (day: number, time: number) => {
    const key = `${day}-${time}`
    setScheduleSlots(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const filtered = professionals.filter(p => {
    const name = (p.user?.name || '').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const handleSave = async () => {
    setFormError('')
    
    // Parse scheduleSlots object into array
    const parsedSchedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = []
    Object.entries(scheduleSlots).forEach(([key, isActive]) => {
      if (!isActive) return
      const [dayStr, timeIdxStr] = key.split('-')
      const dayOfWeek = parseInt(dayStr)
      const timeIdx = parseInt(timeIdxStr)
      
      const startTime = times[timeIdx]
      // Assume 1 hora de duracao padrao ou vai pro proximo
      const endHour = parseInt(startTime.split(':')[0]) + 1
      const endTime = `${endHour.toString().padStart(2, '0')}:${startTime.split(':')[1]}`
      
      parsedSchedules.push({ dayOfWeek, startTime, endTime })
    })

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          name: formData.name,
          phone: formData.phone,
          crm: formData.crm,
          councilType: formData.councilType,
          specialty: formData.specialty,
          bio: formData.bio,
          languages: formData.languages,
          commissionPct: parseFloat(formData.commissionPct) || 50,
          schedules: parsedSchedules,
        })
      } else {
        if (!formData.name || !formData.email || !formData.password) {
          setFormError('Nome, email e senha são obrigatórios para criar um profissional.')
          return
        }
        await createMutation.mutateAsync({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          crm: formData.crm,
          councilType: formData.councilType,
          specialty: formData.specialty,
          bio: formData.bio,
          languages: formData.languages,
          commissionPct: parseFloat(formData.commissionPct) || 50,
          schedules: parsedSchedules,
        })
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        crm: '',
        councilType: 'CRM',
        specialty: '',
        bio: '',
        languages: '',
        userId: '',
        roomId: '',
        insuranceIds: [],
        commissionPct: '50'
      })
      setScheduleSlots({})
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Erro ao salvar profissional.')
    }
  }

  const handleToggleActive = async (pro: typeof professionals[0]) => {
    try {
      await updateMutation.mutateAsync({ id: pro.id, active: !pro.active })
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao alterar status do profissional.')
    }
  }

  const handleEdit = async (pro: typeof professionals[0]) => {
    setEditingId(pro.id)
    setFormData({
      name: pro.user?.name || '',
      email: pro.user?.email || '',
      password: '',
      phone: '',
      crm: pro.crm,
      councilType: pro.councilType || 'CRM',
      specialty: pro.specialty || '',
      bio: pro.bio || '',
      languages: pro.languages || '',
      userId: pro.userId,
      roomId: '', // Set from actual data if available
      insuranceIds: [], // Set from actual data if available
      commissionPct: String(pro.commissionPct ?? 50)
    })

    setAvatarPreview(pro.user?.avatarUrl || null)
    setShowForm(true)

    // Fetch persisted schedules from backend and hydrate the grid.
    // Backend returns [{id, professionalId, dayOfWeek, startTime:"HH:mm", endTime:"HH:mm", isActive}].
    try {
      const { data: fetched } = await api.get<Array<{ dayOfWeek: number; startTime: string; endTime: string }>>(`/schedules/${pro.id}`)
      const newScheduleSlots: Record<string, boolean> = {}
      for (const s of fetched || []) {
        // A single schedule may span multiple 1h slots (e.g. 08:00–11:00 → 08,09,10).
        const [sh, sm] = s.startTime.split(':').map(Number)
        const [eh, em] = s.endTime.split(':').map(Number)
        const startMin = sh * 60 + sm
        const endMin = eh * 60 + em
        times.forEach((t, idx) => {
          const [th, tm] = t.split(':').map(Number)
          const slotStart = th * 60 + tm
          if (slotStart >= startMin && slotStart < endMin) {
            newScheduleSlots[`${s.dayOfWeek}-${idx}`] = true
          }
        })
      }
      setScheduleSlots(newScheduleSlots)
    } catch {
      setScheduleSlots({})
    }
  }

  return (
    <div className="animate-fade-in">
      {!showForm ? (
        <>
          {/* List View */}
          <div className="crud-header">
            <div className="crud-filters">
              <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
                <Search size={16} />
                <input className="input-field" placeholder="Buscar profissional..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ width: 200 }}>
                <ComboBox 
                  placeholder="Todas Especialidades"
                  options={[
                    { value: 'Cardiologia', label: 'Cardiologia' },
                    { value: 'Neurologia', label: 'Neurologia' },
                    { value: 'Oftalmologia', label: 'Oftalmologia' },
                    { value: 'Pediatria', label: 'Pediatria' },
                    { value: 'Ginecologia', label: 'Ginecologia' },
                  ]}
                  value=""
                  onChange={() => {}} 
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingId(null); setFormData({ name: '', email: '', password: '', phone: '', crm: '', councilType: 'CRM', specialty: '', bio: '', languages: '', userId: '', roomId: '', insuranceIds: [], commissionPct: '50' }); setAvatarPreview(null); setShowForm(true); }}>
              <Plus size={16} /> Novo Profissional
            </button>
          </div>

          {isLoading ? (
            <div className="empty-state" style={{ padding: '48px 16px' }}>
              <p>Carregando profissionais...</p>
            </div>
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className="admin-prof-table-wrapper card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Profissional</th>
                      <th>Registro</th>
                      <th>Especialidade</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((pro) => {
                      const name = pro.user?.name || 'Sem nome'
                      const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
                      return (
                        <tr key={pro.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div className="avatar avatar-sm avatar-placeholder" style={{ overflow: 'hidden' }}>
                                {pro.user?.avatarUrl ? (
                                  <img src={pro.user.avatarUrl} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : initials}
                              </div>
                              <span style={{ fontWeight: 500 }}>{name}</span>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{pro.crm}</td>
                          <td><span className="badge badge-emerald">{pro.specialty}</span></td>
                          <td>
                            <span className={`badge ${pro.active ? 'badge-emerald' : 'badge-muted'}`}>
                              {pro.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td>
                            <div className="row-actions">
                              <button className="btn btn-icon btn-sm" title="Editar" onClick={() => handleEdit(pro)}>
                                <Edit size={14} color="var(--color-accent-emerald)" />
                              </button>
                              <button className="btn btn-icon btn-sm" title={pro.active ? 'Desativar' : 'Ativar'} onClick={() => handleToggleActive(pro)} disabled={updateMutation.isPending}>
                                <Power size={14} color={pro.active ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)'} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="admin-prof-card-list card" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.map((pro) => {
                  const name = pro.user?.name || 'Sem nome'
                  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
                  return (
                    <div key={pro.id} className="admin-prof-card">
                      <div className="avatar avatar-sm avatar-placeholder" style={{ overflow: 'hidden', flexShrink: 0 }}>
                        {pro.user?.avatarUrl
                          ? <img src={pro.user.avatarUrl} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          : initials}
                      </div>
                      <div className="admin-prof-card-info">
                        <div className="admin-prof-card-name">{name}</div>
                        <div className="admin-prof-card-sub">{pro.crm}</div>
                        <div className="admin-prof-card-badges">
                          <span className="badge badge-emerald">{pro.specialty}</span>
                          <span className={`badge ${pro.active ? 'badge-emerald' : 'badge-muted'}`}>
                            {pro.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                      <div className="admin-prof-card-actions">
                        <button className="btn btn-icon btn-sm" title="Editar" onClick={() => handleEdit(pro)}>
                          <Edit size={14} color="var(--color-accent-emerald)" />
                        </button>
                        <button className="btn btn-icon btn-sm" title={pro.active ? 'Desativar' : 'Ativar'} onClick={() => handleToggleActive(pro)} disabled={updateMutation.isPending}>
                          <Power size={14} color={pro.active ? 'var(--color-accent-danger)' : 'var(--color-accent-emerald)'} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      ) : (
        /* Form View */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>{editingId ? 'Editar Profissional' : 'Novo Profissional'}</h2>
            <button className="modal-close" onClick={() => { setShowForm(false); setEditingId(null); setFormError('') }}>
              <X size={20} />
            </button>
          </div>

          <div className="card">
            {/* Photo */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const result = await uploadFile(file)
                    setAvatarPreview(result.fileUrl)
                    if (editingId) {
                      await updateMutation.mutateAsync({ id: editingId, avatarUrl: result.fileUrl })
                    }
                  } catch { /* handled by uploading state */ }
                }}
              />
              <div
                className="avatar avatar-xl avatar-placeholder"
                style={{ margin: '0 auto var(--space-3)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <Camera size={32} />
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{uploading ? 'Enviando...' : 'Clique para upload da foto'}</p>
            </div>

            <div className="form-2col">
              <div className="input-group">
                <label className="input-label">Nome completo <span className="required">*</span></label>
                <input
                  className="input-field"
                  placeholder="Nome do profissional"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Email {!editingId && <span className="required">*</span>}</label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  disabled={!!editingId}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              {!editingId && (
                <div className="input-group">
                  <label className="input-label">Senha inicial <span className="required">*</span></label>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              )}
              <div className="input-group">
                <label className="input-label">Telefone</label>
                <input
                  className="input-field"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Registro <span className="required">*</span></label>
                <input 
                  className="input-field" 
                  placeholder="CRM-SP 123456" 
                  value={formData.crm}
                  onChange={e => setFormData(prev => ({ ...prev, crm: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <ComboBox 
                  label="Especialidade"
                  placeholder="Selecione a especialidade..."
                  options={[
                    { value: 'Cardiologia', label: 'Cardiologia' },
                    { value: 'Neurologia', label: 'Neurologia' },
                    { value: 'Oftalmologia', label: 'Oftalmologia' },
                    { value: 'Pediatria', label: 'Pediatria' },
                    { value: 'Ginecologia', label: 'Ginecologia' },
                  ]}
                  value={formData.specialty}
                  onChange={val => setFormData(prev => ({ ...prev, specialty: val }))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Idiomas</label>
                <input 
                  className="input-field" 
                  placeholder="Português, Inglês..." 
                  value={formData.languages}
                  onChange={e => setFormData(prev => ({ ...prev, languages: e.target.value }))}
                />
              </div>
              <div className="input-group full-span">
                <label className="input-label">Biografia</label>
                <textarea 
                  className="input-field" 
                  placeholder="Breve biografia para o portal público..." 
                  value={formData.bio}
                  onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>

              {/* Education */}
              <div className="full-span">
                <label className="input-label" style={{ marginBottom: 8 }}>Formação Acadêmica</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input-field" placeholder="Título / Curso" style={{ flex: 2 }} />
                    <input className="input-field" placeholder="Instituição" style={{ flex: 2 }} />
                    <input className="input-field" placeholder="Ano" style={{ width: 80 }} />
                    <button className="btn btn-icon btn-sm" style={{ color: 'var(--color-accent-danger)' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>
                  <Plus size={14} /> Adicionar formação
                </button>
              </div>

              {/* Banking */}
              <div className="input-group">
                <label className="input-label">Comissão (%)</label>
                <input className="input-field" type="number" placeholder="50" min="0" max="100" value={formData.commissionPct} onChange={e => setFormData({ ...formData, commissionPct: e.target.value })} />
              </div>
              <div className="input-group">
                <ComboBox 
                  label="Sala / Equipamento"
                  placeholder="Selecione a sala..."
                  options={rooms.map(r => ({ value: r.id, label: r.name }))}
                  value={formData.roomId}
                  onChange={val => setFormData({ ...formData, roomId: val })}
                />
              </div>
              <div className="input-group">
                <ComboBox 
                  label="Convênios Aceitos"
                  placeholder="Selecione os convênios..."
                  multiple
                  options={insurancePlans.map(i => ({ value: i.id, label: i.name }))}
                  value={formData.insuranceIds}
                  onChange={vals => setFormData({ ...formData, insuranceIds: vals })}
                />
              </div>
            </div>

            {/* Schedule Grid */}
            <div style={{ marginTop: 'var(--space-8)' }}>
              <label className="input-label" style={{ marginBottom: 12 }}>Grade de Horários</label>
              <div className="schedule-grid-wrapper">
              <div className="schedule-grid">
                <div />
                {days.map(d => <div key={d} className="day-header">{d}</div>)}
                {times.map((t, ti) => (
                  <Fragment key={ti}>
                    <div className="time-cell">{t}</div>
                    {days.map((_, di) => (
                      <div
                        key={`${di}-${ti}`}
                        className={`schedule-slot${scheduleSlots[`${di}-${ti}`] ? ' active' : ''}`}
                        onClick={() => toggleSlot(di, ti)}
                      />
                    ))}
                  </Fragment>
                ))}
              </div>
              </div>{/* end schedule-grid-wrapper */}
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
                Clique nos slots para definir disponibilidade (verde = disponível)
              </p>
            </div>

            {formError && (
              <div style={{ color: 'var(--color-accent-danger)', fontSize: 13, marginTop: 'var(--space-4)' }}>{formError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'var(--space-8)' }}>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); setFormError('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar Profissional'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
