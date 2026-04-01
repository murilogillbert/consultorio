import { useState } from 'react'
import { Search, Plus, Edit, Archive, Camera, X } from 'lucide-react'
import { useServices, useCreateService, useUpdateService, useArchiveService } from '../../hooks/useServices'
import { useRooms } from '../../hooks/useRooms'
import { useInsurances } from '../../hooks/useInsurances'
import { useProfessionals } from '../../hooks/useProfessionals'
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
    roomId: '',
    insuranceIds: [] as string[],
    professionalIds: [] as string[]
  })

  const { data: services = [], isLoading } = useServices()
  const { data: rooms = [] } = useRooms()
  const { data: insurancePlans = [] } = useInsurances()
  const { data: professionals = [] } = useProfessionals()
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const archiveMutation = useArchiveService()

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  const handleSave = async () => {
    setFormError('')
    try {
      const payload = {
        name: formData.name,
        category: formData.category || undefined,
        shortDescription: formData.shortDescription || undefined,
        description: formData.description || undefined,
        duration: parseInt(formData.duration) || 30,
        price: Math.round(parseFloat(formData.price.replace(/[^\d,]/g, '').replace(',', '.')) * 100) || 0,
        preparation: formData.preparation || undefined,
        onlineBooking: formData.onlineBooking,
        roomId: formData.roomId || undefined,
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
      setFormData({ 
        name: '', 
        category: '', 
        shortDescription: '', 
        description: '', 
        duration: '', 
        price: '', 
        preparation: '', 
        onlineBooking: true,
        roomId: '',
        insuranceIds: [],
        professionalIds: []
      })
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Erro ao salvar serviço.')
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
      roomId: (svc as any).roomId || '',
      insuranceIds: svc.insurances?.map(i => i.insurancePlan.id) || [],
      professionalIds: svc.professionals?.map(p => p.professional.id) || []
    })
    setShowForm(true)
  }

  const handleArchive = (id: string) => {
    archiveMutation.mutate(id)
  }

  return (
    <div className="animate-fade-in">
      {!showForm ? (
        <>
          <div className="crud-header">
            <div className="crud-filters">
              <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
                <Search size={16} />
                <input className="input-field" placeholder="Buscar serviço..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="input-field" style={{ width: 'auto' }}>
                <option>Todas Categorias</option>
                <option>Consultas</option>
                <option>Exames</option>
                <option>Procedimentos</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingId(null); setFormData({ name: '', category: '', shortDescription: '', description: '', duration: '', price: '', preparation: '', onlineBooking: true, roomId: '', insuranceIds: [], professionalIds: [] }); setShowForm(true); }}>
              <Plus size={16} /> Novo Serviço
            </button>
          </div>

          {isLoading ? (
            <div className="empty-state" style={{ padding: '48px 16px' }}>
              <p>Carregando serviços...</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Categoria</th>
                    <th>Duração</th>
                    <th>Preço</th>
                    <th>Online</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
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
                        <span className={`badge ${svc.onlineBooking ? 'badge-emerald' : 'badge-muted'}`}>
                          {svc.onlineBooking ? 'Sim' : 'Não'}
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
                          <button className="btn btn-icon btn-sm" title="Arquivar" onClick={() => handleArchive(svc.id)} disabled={archiveMutation.isPending}>
                            <Archive size={14} color="var(--color-accent-warning)" />
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
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)' }}>{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h2>
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
                  placeholder="Nome do serviço" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Categoria <span className="required">*</span></label>
                <select 
                  className="input-field" 
                  value={formData.category} 
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  <option value="Consultas">Consultas</option>
                  <option value="Exames">Exames</option>
                  <option value="Procedimentos">Procedimentos</option>
                  <option value="Pacotes">Pacotes</option>
                </select>
              </div>
              <div className="input-group full-span">
                <label className="input-label">Descrição Curta</label>
                <input 
                  className="input-field" 
                  placeholder="Breve descrição para listagens" 
                  value={formData.shortDescription} 
                  onChange={e => setFormData({ ...formData, shortDescription: e.target.value })} 
                />
              </div>
              <div className="input-group full-span">
                <label className="input-label">Descrição Detalhada</label>
                <textarea 
                  className="input-field" 
                  placeholder="Descrição completa do serviço..." 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Duração Padrão (min) <span className="required">*</span></label>
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
              <div className="input-group">
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
              <div className="input-group">
                <ComboBox 
                  label="Profissionais Habilitados"
                  placeholder="Selecione os profissionais..."
                  multiple
                  options={professionals.map(p => ({ value: p.id, label: p.user?.name || 'Sem nome' }))}
                  value={formData.professionalIds}
                  onChange={vals => setFormData({ ...formData, professionalIds: vals })}
                />
              </div>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Disponível para agendamento online</label>
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
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar Serviço'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
