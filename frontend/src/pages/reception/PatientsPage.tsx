import { useState } from 'react'
import { Search, Plus, Edit, Trash2, X, AlertTriangle } from 'lucide-react'
import { usePatients, useCreatePatient, useUpdatePatient, useDeletePatient } from '../../hooks/usePatients'

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: patients = [], isLoading } = usePatients(searchTerm)
  const [showModal, setShowModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState<any | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')

  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()
  const deletePatient = useDeletePatient()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    birthDate: '',
    address: '',
    notes: ''
  })

  const handleEdit = (patient: any) => {
    setEditingPatient(patient)
    setFormData({
      name: patient.user?.name || '',
      email: patient.user?.email || '',
      cpf: patient.cpf || '',
      phone: patient.phone || '',
      birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : '',
      address: patient.address || '',
      notes: patient.notes || ''
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPatient) {
        await updatePatient.mutateAsync({
          id: editingPatient.id,
          user: { id: editingPatient.userId, name: formData.name, email: editingPatient.user?.email || '' },
          cpf: formData.cpf || undefined,
          phone: formData.phone || undefined,
          birthDate: formData.birthDate || undefined,
          address: formData.address || undefined,
          notes: formData.notes || undefined,
        })
      } else {
        const created = await createPatient.mutateAsync({
          name: formData.name,
          email: formData.email,
          cpf: formData.cpf || '',
          phone: formData.phone || undefined,
          birthDate: formData.birthDate || undefined,
          address: formData.address || undefined,
          notes: formData.notes || undefined,
        })
        setCreatedPassword(created.generatedPassword || '')
      }
      setShowModal(false)
      setEditingPatient(null)
      setFormData({ name: '', email: '', cpf: '', phone: '', birthDate: '', address: '', notes: '' })
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao salvar paciente.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteError('')
    try {
      await deletePatient.mutateAsync(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || 'Erro ao remover paciente.')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="metrics-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Gestão de Pacientes</h2>
        <button className="btn btn-primary" onClick={() => { setEditingPatient(null); setCreatedPassword(''); setShowModal(true) }}>
          <Plus size={18} /> Novo Paciente
        </button>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 40 }}
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {createdPassword && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-accent-emerald)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Paciente criado com acesso inicial</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Senha padrão: <code>{createdPassword}</code>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Carregando pacientes...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Última Consulta</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : (
                patients.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar avatar-sm avatar-placeholder">
                          {(p.user?.name || 'P').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{p.user?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.cpf || '—'}</td>
                    <td style={{ fontSize: 13 }}>{p.phone || '—'}</td>
                    <td style={{ fontSize: 13 }}>—</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-icon btn-sm" onClick={() => handleEdit(p)} title="Editar"><Edit size={14} /></button>
                        <button
                          className="btn btn-icon btn-sm"
                          title="Remover"
                          onClick={() => { setDeleteConfirm({ id: p.id, name: p.user?.name || 'este paciente' }); setDeleteError('') }}
                        >
                          <Trash2 size={14} color="var(--color-accent-danger)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="var(--color-accent-danger)" /> Remover Paciente
              </h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja remover <strong>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.</p>
              {deleteError && (
                <p style={{ color: 'var(--color-accent-danger)', marginTop: 12, fontSize: 13 }}>{deleteError}</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={deletePatient.isPending}
              >
                {deletePatient.isPending ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setCreatedPassword('') }}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPatient ? 'Editar Paciente' : 'Novo Paciente'}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setCreatedPassword('') }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-2col">
                  <div className="input-group">
                    <label className="input-label">Nome Completo <span className="required">*</span></label>
                    <input className="input-field" placeholder="Nome do paciente" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  {!editingPatient ? (
                    <div className="input-group">
                      <label className="input-label">E-mail <span className="required">*</span></label>
                      <input className="input-field" type="email" placeholder="email@exemplo.com" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  ) : (
                    <div className="input-group">
                      <label className="input-label">E-mail</label>
                      <input className="input-field" value={formData.email} disabled style={{ opacity: 0.6 }} />
                    </div>
                  )}
                  <div className="input-group">
                    <label className="input-label">CPF</label>
                    <input className="input-field" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Telefone</label>
                    <input className="input-field" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Data de Nascimento</label>
                    <input className="input-field" type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Endereço</label>
                    <input className="input-field" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Rua, Número, Bairro..." />
                  </div>
                  <div className="input-group full-span">
                    <label className="input-label">Observações</label>
                    <textarea className="input-field" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setCreatedPassword('') }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createPatient.isPending || updatePatient.isPending}>
                  {editingPatient ? 'Salvar Alterações' : 'Criar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
