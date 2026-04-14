import { useState } from 'react'
import { Search, Plus, Edit, Eye, EyeOff, Trash2, Camera, X, AlertTriangle, Tag } from 'lucide-react'
import { useServices, useCreateService, useUpdateService, useToggleServiceActive, useDeleteService, useServiceCategories, useCreateServiceCategory, useDeleteServiceCategory } from '../../hooks/useServices'
import { useRooms } from '../../hooks/useRooms'
import { useEquipments } from '../../hooks/useEquipment'
import { useInsurances } from '../../hooks/useInsurances'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useAuth } from '../../contexts/AuthContext'
import ComboBox from '../../components/ComboBox'

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }
  return `${minutes} min`
}

function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export default function ServicosPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    shortDescription: '',
    description: '',
    duration: '',
    price: '',
    preparation: '',
    onlineBooking: true,
    roomIds: [] as string[],
    equipmentIds: [] as string[],
    insuranceIds: [] as string[],
    professionalIds: [] as string[]
  })

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')

  const { user } = useAuth()
  const clinicId = (user as any)?.systemUsers?.[0]?.clinicId

  const { data: services = [], isLoading } = useServices()
  const { data: rooms = [] } = useRooms()
  const { data: equipments = [] } = useEquipments(clinicId)
  const { data: insurancePlans = [] } = useInsurances()
  const { data: professionals = [] } = useProfessionals()
  const { data: categories = [] } = useServiceCategories()
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const toggleActiveMutation = useToggleServiceActive()
  const deleteMutation = useDeleteService()
  const createCategoryMutation = useCreateServiceCategory()
  const deleteCategoryMutation = useDeleteServiceCategory()

  const filtered = services.filter(s => {
    if (!s.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && s.category !== categoryFilter) return false
    return true
  })

  const emptyForm = {
    name: '', category: '', shortDescription: '', description: '',
    duration: '', price: '', preparation: '', onlineBooking: true,
    roomIds: [] as string[], equipmentIds: [] as string[],
    insuranceIds: [] as string[], professionalIds: [] as string[]
  }

  const handleSave = async () => {
    setFormError('')
    if (!formData.name.trim()) { setFormError('Nome e obrigatorio.'); return }
    try {
      const priceRaw = formData.price.replace(/[^\d,]/g, '').replace(',', '.')
      const payload = {
        name: formData.name.trim(),
        category: formData.category || undefined,
        shortDescription: formData.shortDescription || undefined,
        description: formData.description || undefined,
        duration: parseInt(formData.duration) || 30,
        price: Math.round(parseFloat(priceRaw) * 100) || 0,
        preparation: formData.preparation || undefined,
        onlineBooking: formData.onlineBooking,
        roomIds: formData.roomIds,
        equipmentIds: formData.equipmentIds,
        insuranceIds: formData.insuranceIds,
        professionalIds: formData.professionalIds,
      }
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData(emptyForm)
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Erro ao salvar servico.')
    }
  }

  const handleEdit = (svc: typeof services[0]) => {
    setEditingId(svc.id)
    setFormData({
      name: svc.name,
      category: svc.category || '',
      shortDescription: svc.shortDescription || '',
      description: svc.description || '',
      duration: String(svc.duration),
      price: (svc.price / 100).toFixed(2).replace('.', ','),
      preparation: svc.preparation || '',
      onlineBooking: svc.onlineBooking,
      roomIds: svc.rooms?.map(r => r.id) || [],
      equipmentIds: svc.equipments?.map(e => e.id) || [],
      insuranceIds: svc.insurances?.map(i => i.insurancePlan.id) || [],
      professionalIds: svc.professionals?.map(p => p.professional.id) || []
    })
    setShowForm(true)
  }

  const handleToggleActive = (id: string) => {
    toggleActiveMutation.mutate(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    setDeleteError('')
    try {
      await deleteMutation.mutateAsync(deleteConfirmId)
      setDeleteConfirmId(null)
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || 'Erro ao excluir servico.')
    }
  }

  const handleCreateCategory = async () => {
    setCategoryError('')
    if (!newCategoryName.trim()) { setCategoryError('Nome e obrigatorio.'); return }
    try {
      await createCategoryMutation.mutateAsync(newCategoryName.trim())
      setNewCategoryName('')
    } catch (err: any) {
      setCategoryError(err?.response?.data?.message || 'Erro ao criar categoria.')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategoryMutation.mutateAsync(id)
    } catch (err: any) {
      setCategoryError(err?.response?.data?.message || 'Erro ao excluir categoria.')
    }
  }

  // All category options (from API + fallback distinct from existing services)
  const allCategoryNames = new Set<string>()
  categories.forEach(c => allCategoryNames.add(c.name))
  services.forEach(s => { if (s.category) allCategoryNames.add(s.category) })
  const categoryOptions = Array.from(allCategoryNames).sort()

  return (
    <div className="animate-fade-in">

      {/* ── Modal de confirmacao de exclusao ── */}
      {deleteConfirmId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ maxWidth: 420, width: '90%', padding: 'var(--space-8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-4)' }}>
              <AlertTriangle size={24} color="var(--color-accent-danger)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', margin: 0 }}>
                Excluir Servico
              </h3>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 'var(--space-4)' }}>
              Tem certeza que deseja excluir permanentemente o servico{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>{deleteConfirmName}</strong>?
              <br /><br />
              Esta acao nao pode ser desfeita. Se o servico possui agendamentos, use o botao{' '}
              <EyeOff size={12} style={{ verticalAlign: 'middle' }} /> <em>Desativar</em> para oculta-lo do site.
            </p>
            {deleteError && (
              <div style={{
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', fontSize: 13,
                color: 'var(--color-accent-danger)', marginBottom: 'var(--space-4)'
              }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => { setDeleteConfirmId(null); setDeleteError('') }}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--color-accent-danger)' }}
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Categorias ── */}
      {showCategoryModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ maxWidth: 480, width: '90%', padding: 'var(--space-8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={20} /> Gerenciar Categorias
              </h3>
              <button className="modal-close" onClick={() => { setShowCategoryModal(false); setCategoryError('') }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)' }}>
              <input
                className="input-field"
                placeholder="Nome da nova categoria..."
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
              />
              <button className="btn btn-primary" onClick={handleCreateCategory} disabled={createCategoryMutation.isPending}>
                <Plus size={14} /> Criar
              </button>
            </div>

            {categoryError && (
              <div style={{
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', fontSize: 13,
                color: 'var(--color-accent-danger)', marginBottom: 'var(--space-4)'
              }}>
                {categoryError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {categories.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: 'var(--space-4)', textAlign: 'center' }}>
                  Nenhuma categoria criada ainda.
                </p>
              )}
              {categories.map(cat => (
                <div key={cat.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)'
                }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{cat.name}</span>
                  <button
                    className="btn btn-icon btn-sm"
                    title="Excluir categoria"
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={deleteCategoryMutation.isPending}
                  >
                    <Trash2 size={14} color="var(--color-accent-danger)" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!showForm ? (
        <>
          <div className="crud-header">
            <div className="crud-filters">
              <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
                <Search size={16} />
                <input className="input-field" placeholder="Buscar servico..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select
                className="input-field"
                style={{ width: 'auto' }}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="">Todas Categorias</option>
                {categoryOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCategoryModal(true)} title="Gerenciar categorias">
                <Tag size={14} /> Categorias
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingId(null); setFormData(emptyForm); setShowForm(true); }}>
              <Plus size={16} /> Novo Servico
            </button>
          </div>

          {isLoading ? (
            <div className="empty-state" style={{ padding: '48px 16px' }}>
              <p>Carregando servicos...</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Servico</th>
                    <th>Categoria</th>
                    <th>Duracao</th>
                    <th>Preco</th>
                    <th>Salas</th>
                    <th>Equipamentos</th>
                    <th>Online</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((svc) => (
                    <tr key={svc.id}>
                      <td style={{ fontWeight: 500 }}>{svc.name}</td>
                      <td><span className="badge badge-gold">{svc.category || '—'}</span></td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatDuration(svc.duration)}</td>
                      <td style={{ color: 'var(--color-accent-gold)', fontWeight: 500 }}>{formatPrice(svc.price)}</td>
                      <td>
                        {svc.rooms && svc.rooms.length > 0
                          ? <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{svc.rooms.map(r => r.name).join(', ')}</span>
                          : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>
                        }
                      </td>
                      <td>
                        {svc.equipments && svc.equipments.length > 0
                          ? <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{svc.equipments.map(e => e.name).join(', ')}</span>
                          : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>
                        }
                      </td>
                      <td>
                        <span className={`badge ${svc.onlineBooking ? 'badge-emerald' : 'badge-muted'}`}>
                          {svc.onlineBooking ? 'Sim' : 'Nao'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${svc.active ? 'badge-emerald' : 'badge-muted'}`}>
                          {svc.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-icon btn-sm" title="Editar" onClick={() => handleEdit(svc)}>
                            <Edit size={14} color="var(--color-accent-emerald)" />
                          </button>
                          <button
                            className="btn btn-icon btn-sm"
                            title={svc.active ? 'Desativar (ocultar do site)' : 'Ativar'}
                            onClick={() => handleToggleActive(svc.id)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            {svc.active
                              ? <EyeOff size={14} color="var(--color-accent-warning)" />
                              : <Eye size={14} color="var(--color-accent-emerald)" />
                            }
                          </button>
                          <button
                            className="btn btn-icon btn-sm"
                            title="Excluir permanentemente"
                            onClick={() => { setDeleteConfirmId(svc.id); setDeleteConfirmName(svc.name); setDeleteError('') }}
                          >
                            <Trash2 size={14} color="var(--color-accent-danger)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>{editingId ? 'Editar Servico' : 'Novo Servico'}</h2>
            <button className="modal-close" onClick={() => { setShowForm(false); setEditingId(null); setFormError('') }}><X size={20} /></button>
          </div>
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
              <div style={{ width: 120, height: 80, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', cursor: 'pointer', border: '2px dashed var(--color-border-default)' }}>
                <Camera size={24} color="var(--color-text-muted)" />
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Imagem de capa</p>
            </div>
            <div className="form-2col">
              <div className="input-group">
                <label className="input-label">Nome <span className="required">*</span></label>
                <input
                  className="input-field"
                  placeholder="Nome do servico"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Categoria</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent-brand)', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => setShowCategoryModal(true)}
                  >
                    <Plus size={12} /> Gerenciar
                  </button>
                </label>
                <select
                  className="input-field"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {categoryOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="input-group full-span">
                <label className="input-label">Descricao Curta</label>
                <input
                  className="input-field"
                  placeholder="Breve descricao para listagens"
                  value={formData.shortDescription}
                  onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                />
              </div>
              <div className="input-group full-span">
                <label className="input-label">Descricao Detalhada</label>
                <textarea
                  className="input-field"
                  placeholder="Descricao completa do servico..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Duracao Padrao (min) <span className="required">*</span></label>
                <input
                  className="input-field"
                  placeholder="30"
                  type="number"
                  value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Valor (R$) <span className="required">*</span></label>
                <input
                  className="input-field"
                  placeholder="0,00"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="input-group full-span">
                <label className="input-label">Preparo do Paciente</label>
                <textarea
                  className="input-field"
                  placeholder="Ex: Jejum de 8 horas..."
                  style={{ minHeight: 60 }}
                  value={formData.preparation}
                  onChange={e => setFormData({ ...formData, preparation: e.target.value })}
                />
              </div>
              <div className="input-group">
                <ComboBox
                  label="Salas"
                  placeholder="Selecione as salas..."
                  multiple
                  options={rooms.map(r => ({ value: r.id, label: r.name }))}
                  value={formData.roomIds}
                  onChange={(vals: string[]) => setFormData({ ...formData, roomIds: vals })}
                />
              </div>
              <div className="input-group">
                <ComboBox
                  label="Equipamentos"
                  placeholder="Selecione os equipamentos..."
                  multiple
                  options={equipments.map(e => ({ value: e.id, label: e.name }))}
                  value={formData.equipmentIds}
                  onChange={(vals: string[]) => setFormData({ ...formData, equipmentIds: vals })}
                />
              </div>
              <div className="input-group">
                <ComboBox
                  label="Convenios Aceitos"
                  placeholder="Selecione os convenios..."
                  multiple
                  options={insurancePlans.map(i => ({ value: i.id, label: i.name }))}
                  value={formData.insuranceIds}
                  onChange={(vals: string[]) => setFormData({ ...formData, insuranceIds: vals })}
                />
              </div>
              <div className="input-group">
                <ComboBox
                  label="Profissionais Habilitados"
                  placeholder="Selecione os profissionais..."
                  multiple
                  options={professionals.map(p => ({ value: p.id, label: p.user?.name || 'Sem nome' }))}
                  value={formData.professionalIds}
                  onChange={(vals: string[]) => setFormData({ ...formData, professionalIds: vals })}
                />
              </div>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Disponivel para agendamento online</label>
                <div
                  className={`toggle ${formData.onlineBooking ? 'active' : ''}`}
                  style={{ flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => setFormData({ ...formData, onlineBooking: !formData.onlineBooking })}
                />
              </div>
            </div>
            {formError && (
              <div style={{ color: 'var(--color-accent-danger)', fontSize: 13, marginTop: 'var(--space-4)' }}>{formError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'var(--space-8)' }}>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); setFormError('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar Servico'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
